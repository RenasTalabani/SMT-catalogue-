import { Request, Response, NextFunction } from 'express';
import { error } from '../../shared/utils/response.util';

interface OrderItem { productId: number; quantity: number; }

export const validateOrder = (req: Request, res: Response, next: NextFunction): void => {
  const { items } = req.body as { items?: OrderItem[] };
  if (!Array.isArray(items) || items.length === 0) {
    error(res, 'Order must contain at least one item', 400);
    return;
  }
  for (const item of items) {
    const productId = parseInt(String(item.productId), 10);
    const quantity  = parseInt(String(item.quantity),  10);
    if (isNaN(productId) || productId < 1) { error(res, 'Each item must have a valid productId', 400); return; }
    if (isNaN(quantity)  || quantity  < 1) { error(res, 'Each item quantity must be at least 1',  400); return; }
    item.productId = productId;
    item.quantity  = quantity;
  }
  next();
};

export const validateStatusUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const VALID = ['PENDING', 'COMPLETED', 'CANCELLED'];
  const { status } = req.body as { status?: string };
  if (!status || !VALID.includes(status)) {
    error(res, `Status must be one of: ${VALID.join(', ')}`, 400);
    return;
  }
  next();
};
