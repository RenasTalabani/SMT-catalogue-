import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as svc from './notification.service';

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const page   = Number(req.query['page']) || 1;
  const limit  = Math.min(Number(req.query['limit']) || 20, 100);

  const [notifications, unread] = await Promise.all([
    svc.getUserNotifications(userId, page, limit),
    svc.getUnreadCount(userId),
  ]);

  success(res, { notifications, unreadCount: unread, page, limit });
};

export const readOne = async (req: AuthRequest, res: Response): Promise<void> => {
  const id     = Number(req.params['id']);
  const userId = req.user!.id;

  if (!id) { error(res, 'Invalid id', 400); return; }
  await svc.markAsRead(id, userId);
  success(res, { message: 'Marked as read' });
};

export const readAll = async (req: AuthRequest, res: Response): Promise<void> => {
  await svc.markAllAsRead(req.user!.id);
  success(res, { message: 'All notifications marked as read' });
};

export const unreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  const count = await svc.getUnreadCount(req.user!.id);
  success(res, { unreadCount: count });
};
