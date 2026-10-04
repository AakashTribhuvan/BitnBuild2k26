import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

const createRateLimiter = (
  windowMs: number,
  max: number,
  prefix: string,
  keyGenerator?: (request: Express.Request) => string,
) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: ((...args: string[]) => (redis as any).call(...args)) as any,
      prefix,
    }),
  });
};

export const joinQueueLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'rl:queue_join:',
  (request) => {
    if (!request.user) throw new Error('Queue join limiter requires an authenticated account');
    return request.user.userId;
  },
);
export const queueOverviewLimiter = createRateLimiter(60 * 1000, 120, 'rl:queue_overview:');
export const holdSeatLimiter = createRateLimiter(5 * 60 * 1000, 10, 'rl:seat_hold:');
export const registerLimiter = createRateLimiter(60 * 60 * 1000, 3, 'rl:register:');
export const googleSignInLimiter = createRateLimiter(15 * 60 * 1000, 20, 'rl:google_signin:');
export const demoSignInLimiter = createRateLimiter(15 * 60 * 1000, 10, 'rl:demo_signin:');
export const paymentIntentLimiter = createRateLimiter(10 * 60 * 1000, 5, 'rl:payment_intent:');
export const mockScanLimiter = createRateLimiter(10 * 60 * 1000, 15, 'rl:mock_scan:');
export const simulationStartLimiter = createRateLimiter(15 * 60 * 1000, 3, 'rl:simulation_start:');
