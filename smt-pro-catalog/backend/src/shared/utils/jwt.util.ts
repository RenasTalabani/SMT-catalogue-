import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types';

const secret = process.env['JWT_SECRET'];
const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';

if (!secret) {
  if (process.env['NODE_ENV'] === 'production') {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start in production without it.');
    process.exit(1);
  } else {
    console.warn('[security] JWT_SECRET not set — using insecure dev secret. Set it before deploying.');
  }
}

const resolvedSecret = secret ?? 'dev-only-insecure-secret-do-not-use-in-production';

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, resolvedSecret, { expiresIn } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, resolvedSecret) as JwtPayload;
