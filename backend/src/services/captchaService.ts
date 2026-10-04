import { ApiError } from '../utils/apiError';

export const isTurnstileConfigured = () => Boolean(
  process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY,
);

export const isTurnstileRequired = () => process.env.TURNSTILE_REQUIRED === 'true';

export const verifyTurnstile = async (
  token?: string,
  required = isTurnstileRequired(),
  expectedAction?: string,
) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (required && !isTurnstileConfigured()) {
    throw new ApiError('CAPTCHA verification is required but Turnstile is not fully configured', 503);
  }
  if (!secret) {
    return false;
  }

  if (!token) {
    if (required) {
      throw new ApiError('Complete the CAPTCHA challenge before continuing', 400);
    }
    return false;
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new ApiError(`Turnstile verification failed with status ${response.status}`, 502);
  }

  const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
  if (!result.success) {
    throw new ApiError('CAPTCHA verification failed. Please try again.', 400);
  }
  if (expectedAction && result.action !== expectedAction) {
    throw new ApiError('CAPTCHA verification was issued for a different action. Please retry.', 400);
  }
  const configuredHostnames = process.env.TURNSTILE_EXPECTED_HOSTNAME
    ? process.env.TURNSTILE_EXPECTED_HOSTNAME.split(',').map((hostname) => hostname.trim()).filter(Boolean)
    : (process.env.CORSORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((origin) => new URL(origin.trim()).hostname);
  if (configuredHostnames.length && !configuredHostnames.includes(result.hostname || '')) {
    throw new ApiError('CAPTCHA verification was issued for a different website.', 400);
  }
  return true;
};
