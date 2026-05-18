import { Request, Response, NextFunction } from 'express';
import { error } from '../../shared/utils/response.util';

const VALID_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];

export const validateStockMovement = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Record<string, string | undefined>;
  const pid = parseInt(body['productId'] ?? '', 10);
  if (isNaN(pid) || pid < 1) { error(res, 'Valid productId is required', 400); return; }

  const type = body['type'];
  if (!type || !VALID_TYPES.includes(type)) { error(res, `Type must be one of: ${VALID_TYPES.join(', ')}`, 400); return; }

  const qty = parseInt(body['quantity'] ?? '', 10);
  if (isNaN(qty) || qty < 1) { error(res, 'Quantity must be at least 1', 400); return; }

  req.body.productId = pid;
  req.body.quantity  = qty;
  if (body['notes']) req.body.notes = String(body['notes']).trim();
  next();
};

export const validateSupplier = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Record<string, string | undefined>;
  const name = body['name'];
  if (!name || String(name).trim().length < 2) { error(res, 'Supplier name must be at least 2 characters', 400); return; }
  const email = body['email'];
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error(res, 'Invalid email format', 400); return; }

  req.body.name = String(name).trim();
  if (body['phone'])   req.body.phone   = String(body['phone']).trim();
  if (email)           req.body.email   = email.trim().toLowerCase();
  if (body['address']) req.body.address = String(body['address']).trim();
  next();
};
