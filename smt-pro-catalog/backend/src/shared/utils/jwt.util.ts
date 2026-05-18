import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types';

const secret = process.env['JWT_SECRET'] ?? 'fallback-secret-change-in-production';
const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, secret) as JwtPayload;
