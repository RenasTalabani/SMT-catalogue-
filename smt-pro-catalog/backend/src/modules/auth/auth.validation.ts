import { Request, Response, NextFunction } from 'express';
import { error } from '../../shared/utils/response.util';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  if (!name || name.trim().length < 2)    { error(res, 'Name must be at least 2 characters', 400); return; }
  if (!email || !EMAIL_RE.test(email))    { error(res, 'A valid email is required', 400); return; }
  if (!password || password.length < 8)   { error(res, 'Password must be at least 8 characters', 400); return; }
  req.body.name  = name.trim();
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !EMAIL_RE.test(email)) { error(res, 'A valid email is required', 400); return; }
  if (!password)                       { error(res, 'Password is required', 400); return; }
  req.body.email = email.toLowerCase().trim();
  next();
};
