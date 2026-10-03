import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

const createRateLimiter = (windowMs: number, max: number, prefix: string) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: ((...args: string[]) => (redis as any).call(...args)) as any,
      prefix,
    }),
  });
};

export const joinQueueLimiter = createRateLimiter(15 * 60 * 1000, 5, 'rl:queue_join:');
export const holdSeatLimiter = createRateLimiter(5 * 60 * 1000, 10, 'rl:seat_hold:');
export const registerLimiter = createRateLimiter(60 * 60 * 1000, 3, 'rl:register:');
export const paymentIntentLimiter = createRateLimiter(10 * 60 * 1000, 5, 'rl:payment_intent:');
export const mockScanLimiter = createRateLimiter(10 * 60 * 1000, 15, 'rl:mock_scan:');
