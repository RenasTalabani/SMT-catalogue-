import { Request, Response } from 'express';
import * as authService from './auth.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest } from '../../types';
import prisma from '../../config/prisma';
import { audit } from '../../shared/middlewares/audit.middleware';

const ERR: Record<string, { s: number; m: string }> = {
  EMAIL_TAKEN:         { s: 409, m: 'This email is already registered' },
  INVALID_CREDENTIALS: { s: 401, m: 'Invalid email or password' },
  ACCOUNT_DEACTIVATED: { s: 403, m: 'Your account has been deactivated. Contact your administrator.' },
};

const resolve = (e: Error, res: Response, fallback: string): Response => {
  const mapped = ERR[e.message];
  return error(res, mapped?.m ?? fallback, mapped?.s ?? 500);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.register(req.body as { name: string; email: string; password: string });
    void audit(result.user.id, 'REGISTER', 'User', result.user.id, { email: result.user.email });
    success(res, result, 'Account created successfully', 201);
  } catch (e) { resolve(e as Error, res, 'Registration failed'); }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body as { email: string; password: string });
    void audit(result.user.id, 'LOGIN', 'User', result.user.id, {
      ip:        req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    success(res, result, 'Login successful');
  } catch (e) { resolve(e as Error, res, 'Login failed'); }
};

export const updateFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fcmToken } = req.body as { fcmToken: string };
  if (!fcmToken) { error(res, 'fcmToken is required', 400); return; }

  await prisma.user.update({
    where: { id: req.user!.id },
    data:  { fcmToken },
  });
  success(res, { message: 'FCM token updated' });
};
