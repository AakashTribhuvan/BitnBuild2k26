import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../utils/apiError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  const status = err instanceof ApiError ? err.status : err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
};
