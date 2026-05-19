import { Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import logger from '../utils/logger.util';
import { AuthRequest } from '../../types';

export const audit = async (
  userId: number,
  action: string,
  entity: string,
  entityId: number | null = null,
  metadata: unknown = null,
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  } catch (err) {
    logger.warn('[audit] Failed to write audit log:', (err as Error).message);
  }
};

export const auditMiddleware =
  (action: string, entity: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const original = res.json.bind(res) as typeof res.json;
    res.json = (body: unknown): Response => {
      if (res.statusCode < 400 && req.user?.id) {
        const bodyObj = body as Record<string, unknown> | null;
        const rawId = (bodyObj?.['data'] as Record<string, unknown>)?.['id'] ?? req.params?.['id'];
        const entityId = rawId != null ? parseInt(String(rawId)) : null;
        void audit(req.user.id, action, entity, Number.isNaN(entityId ?? NaN) ? null : entityId);
      }
      return original(body);
    };
    next();
  };
