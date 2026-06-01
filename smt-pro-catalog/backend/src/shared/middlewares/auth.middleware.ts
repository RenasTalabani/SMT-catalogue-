import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { error } from '../utils/response.util';
import { AuthRequest } from '../../types';

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header     = req.headers.authorization;
  const queryToken = req.query['token'] as string | undefined;

  // Accept token from Authorization header OR ?token= query param (needed for PDF/file downloads)
  const tokenStr = header?.startsWith('Bearer ')
    ? header.split(' ')[1]!
    : queryToken;

  if (!tokenStr) {
    error(res, 'No token provided', 401);
    return;
  }

  try {
    req.user = verifyToken(tokenStr);
    next();
  } catch {
    error(res, 'Invalid or expired token', 401);
  }
};
