import admin from 'firebase-admin';
import logger from '../shared/utils/logger.util';

let _app: admin.app.App | null = null;

const SA = process.env['FIREBASE_SERVICE_ACCOUNT'];

if (SA) {
  try {
    const serviceAccount = JSON.parse(SA) as admin.ServiceAccount;
    _app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    logger.info('[firebase] Admin SDK initialized');
  } catch (e) {
    logger.warn('[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT: ' + (e as Error).message);
  }
} else {
  logger.info('[firebase] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
}

export const getFirebaseApp = (): admin.app.App | null => _app;
export const getMessaging  = (): admin.messaging.Messaging | null =>
  _app ? admin.messaging(_app) : null;
