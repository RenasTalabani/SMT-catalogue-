import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { error } from '../utils/response.util';
import { AuthRequest } from '../../types';

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    error(res, 'No token provided', 401);
    return;
  }

  try {
    req.user = verifyToken(header.split(' ')[1]!);
    next();
  } catch {
    error(res, 'Invalid or expired token', 401);
  }
};
