import { getMessaging } from '../../config/firebase';
import logger from '../../shared/utils/logger.util';

interface PushPayload {
  title: string;
  body:  string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export const sendPushToToken = async (
  fcmToken: string,
  payload:  PushPayload,
): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging) return false;

  try {
    await messaging.send({
      token:        fcmToken,
      notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
      data:         payload.data,
      android: { priority: 'high' },
      apns:    { payload: { aps: { sound: 'default' } } },
    });
    return true;
  } catch (err) {
    logger.warn('[fcm] Failed to send push: ' + (err as Error).message);
    return false;
  }
};

export const sendPushToTokens = async (
  fcmTokens: string[],
  payload:   PushPayload,
): Promise<{ successCount: number; failureCount: number }> => {
  const messaging = getMessaging();
  if (!messaging || fcmTokens.length === 0) return { successCount: 0, failureCount: 0 };

  const response = await messaging.sendEachForMulticast({
    tokens:       fcmTokens,
    notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
    data:         payload.data,
    android: { priority: 'high' },
    apns:    { payload: { aps: { sound: 'default' } } },
  });

  logger.info(`[fcm] Multicast — success=${response.successCount} failure=${response.failureCount}`);
  return { successCount: response.successCount, failureCount: response.failureCount };
};

export const sendPushToTopic = async (topic: string, payload: PushPayload): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging) return false;

  try {
    await messaging.send({
      topic,
      notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
      data:         payload.data,
    });
    return true;
  } catch (err) {
    logger.warn(`[fcm] Topic send failed (${topic}): ` + (err as Error).message);
    return false;
  }
};
