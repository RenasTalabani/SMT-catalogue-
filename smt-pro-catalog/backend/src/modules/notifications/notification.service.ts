import prisma from '../../config/prisma';
import { sendPushToToken } from './fcm.service';
import { getIO } from '../../config/socket';

export interface CreateNotificationInput {
  userId: number;
  title:  string;
  body:   string;
  type?:  string;
  data?:  Record<string, unknown>;
}

export const createNotification = async (input: CreateNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title:  input.title,
      body:   input.body,
      type:   input.type ?? 'info',
      data:   input.data ? (input.data as import('@prisma/client').Prisma.InputJsonValue) : undefined,
    },
  });

  // Real-time delivery via Socket.IO
  getIO()?.to(`user:${input.userId}`).emit('notification:new', notification);

  // Push notification if user has FCM token
  const user = await prisma.user.findUnique({
    where:  { id: input.userId },
    select: { fcmToken: true },
  });
  if (user?.fcmToken) {
    await sendPushToToken(user.fcmToken, {
      title: input.title,
      body:  input.body,
      data:  input.data ? Object.fromEntries(
        Object.entries(input.data).map(([k, v]) => [k, String(v)])
      ) : undefined,
    });
  }

  return notification;
};

export const broadcastNotification = async (input: Omit<CreateNotificationInput, 'userId'> & { userIds: number[] }) => {
  const results = await Promise.allSettled(
    input.userIds.map((userId) =>
      createNotification({ userId, title: input.title, body: input.body, type: input.type, data: input.data })
    )
  );
  return results.filter((r) => r.status === 'fulfilled').length;
};

export const getUserNotifications = (userId: number, page = 1, limit = 20) =>
  prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    skip:    (page - 1) * limit,
    take:    limit,
  });

export const markAsRead = (id: number, userId: number) =>
  prisma.notification.updateMany({
    where: { id, userId },
    data:  { isRead: true },
  });

export const markAllAsRead = (userId: number) =>
  prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });

export const getUnreadCount = (userId: number) =>
  prisma.notification.count({ where: { userId, isRead: false } });

// Send to all admin + super_admin users
export const broadcastToAdmins = async (
  title: string, body: string, type = 'info', data?: Record<string, unknown>,
): Promise<void> => {
  const admins = await prisma.user.findMany({
    where:  { role: { in: ['admin', 'super_admin'] }, isActive: true },
    select: { id: true },
  });
  await Promise.allSettled(
    admins.map((a) => createNotification({ userId: a.id, title, body, type, data })),
  );
};
