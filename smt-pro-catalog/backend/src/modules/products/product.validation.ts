import { Request, Response, NextFunction } from 'express';
import { error } from '../../shared/utils/response.util';

export const validateProduct = (req: Request, res: Response, next: NextFunction): void => {
  const { name, price, quantity, category } = req.body as Record<string, string | undefined>;
  if (!name || name.trim().length < 2)       { error(res, 'Product name must be at least 2 characters', 400); return; }
  const p = parseFloat(price ?? '');
  if (isNaN(p) || p <= 0)                    { error(res, 'Price must be greater than 0', 400); return; }
  const q = parseInt(quantity ?? '', 10);
  if (isNaN(q) || q < 0)                    { error(res, 'Quantity must be a non-negative integer', 400); return; }
  if (!category || !category.trim())         { error(res, 'Category is required', 400); return; }

  req.body.name     = name.trim();
  req.body.category = category.trim();
  req.body.price    = p;
  req.body.quantity = q;
  next();
};

export const validateProductUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Record<string, string | undefined>;
  if (body['name']     !== undefined) {
    if ((body['name'] ?? '').trim().length < 2) { error(res, 'Name must be at least 2 characters', 400); return; }
    req.body.name = (body['name'] ?? '').trim();
  }
  if (body['price']    !== undefined) {
    const p = parseFloat(body['price'] ?? '');
    if (isNaN(p) || p <= 0) { error(res, 'Price must be > 0', 400); return; }
    req.body.price = p;
  }
  if (body['quantity'] !== undefined) {
    const q = parseInt(body['quantity'] ?? '', 10);
    if (isNaN(q) || q < 0) { error(res, 'Quantity must be >= 0', 400); return; }
    req.body.quantity = q;
  }
  if (body['category'] !== undefined) {
    if (!(body['category'] ?? '').trim()) { error(res, 'Category cannot be empty', 400); return; }
    req.body.category = (body['category'] ?? '').trim();
  }
  next();
};
