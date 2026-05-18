import { Response, NextFunction } from 'express';
import { error } from '../utils/response.util';
import { AuthRequest, UserRole } from '../../types';

export const restrictTo = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role as UserRole)) {
      error(res, 'You do not have permission to perform this action', 403);
      return;
    }
    next();
  };
