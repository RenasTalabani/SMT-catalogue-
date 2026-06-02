import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { error }       from '../utils/response.util';
import { AuthRequest } from '../../types';
import prisma          from '../../config/prisma';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    const payload = verifyToken(tokenStr);

    // Block deactivated accounts even if their token is still valid
    const user = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { isActive: true },
    });
    if (!user || !user.isActive) {
      error(res, 'Account is deactivated. Contact your administrator.', 403);
      return;
    }

    req.user = payload;
    next();
  } catch {
    error(res, 'Invalid or expired token', 401);
  }
};
