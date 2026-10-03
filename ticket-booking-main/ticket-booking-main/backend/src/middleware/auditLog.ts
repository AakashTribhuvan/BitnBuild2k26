import { query } from '../config/database';
import { Request, Response, NextFunction } from 'express';

export const auditLog = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.userId || null;
        const entityId = req.params.id || req.body.id || null;
        query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, action, entityType, entityId, JSON.stringify(req.body), req.ip]
        ).catch(err => console.error('Audit log failed', err));
      }
      return originalSend.call(this, body);
    };
    next();
  };
};
