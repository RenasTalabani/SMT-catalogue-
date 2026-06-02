import admin from 'firebase-admin';
import logger from '../shared/utils/logger.util';

let _app: admin.app.App | null = null;

const init = () => {
  // Support both a single JSON env var or three separate vars
  const sa = process.env['FIREBASE_SERVICE_ACCOUNT'];
  if (sa) {
    try {
      return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa) as admin.ServiceAccount) });
    } catch (e) {
      logger.warn('[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT: ' + (e as Error).message);
      return null;
    }
  }

  const projectId   = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey  = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch (e) {
      logger.warn('[firebase] Failed to initialize from env vars: ' + (e as Error).message);
      return null;
    }
  }

  logger.info('[firebase] No Firebase credentials found — push notifications disabled');
  return null;
};

_app = init();
if (_app) logger.info('[firebase] Admin SDK initialized ✓');

export const getFirebaseApp = (): admin.app.App | null => _app;
export const getMessaging  = (): admin.messaging.Messaging | null =>
  _app ? admin.messaging(_app) : null;
