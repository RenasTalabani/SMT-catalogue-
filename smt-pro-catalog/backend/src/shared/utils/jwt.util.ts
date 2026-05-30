import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types';

const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';

// Secret is read at call-time so the module never calls process.exit().
// The HTTP server starts unconditionally; if JWT_SECRET is missing the
// sign/verify calls throw at runtime (login returns 500, server stays up).
const getSecret = (): string => {
  const s = process.env['JWT_SECRET'];
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
};

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, getSecret()) as JwtPayload;
