import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as cartService from './cart.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  CART_EMPTY:            { s: 400, m: 'Your cart is empty' },
  CART_NOT_FOUND:        { s: 404, m: 'Cart not found' },
  PRODUCT_NOT_FOUND:     { s: 404, m: 'Product not found or unavailable' },
  INVALID_QUANTITY:      { s: 400, m: 'Quantity must be at least 1' },
  CREDIT_LIMIT_EXCEEDED: { s: 400, m: 'Order exceeds available credit limit' },
};

const resolve = (e: Error, res: Response): Response => {
  const msg = e.message;
  if (msg.startsWith('INSUFFICIENT_STOCK:')) return error(res, `Insufficient stock: ${msg.split(':')[1]}`, 400);
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await cartService.getCart(req.user.id)); }
  catch (e) { resolve(e as Error, res); }
};

export const addItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { productId: number; quantity: number; variantId?: number };
    if (!b.productId) { error(res, 'productId is required', 400); return; }
    success(res, await cartService.addItem(req.user.id, Number(b.productId), Number(b.quantity ?? 1), b.variantId ? Number(b.variantId) : undefined));
  } catch (e) { resolve(e as Error, res); }
};

export const removeItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await cartService.removeItem(req.user.id, Number(req.params['itemId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await cartService.clearCart(req.user.id); success(res, null, 'Cart cleared'); }
  catch (e) { resolve(e as Error, res); }
};

export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof cartService.checkout>[1];
    if (!b.paymentMethod) { error(res, 'paymentMethod is required', 400); return; }
    success(res, await cartService.checkout(req.user.id, b), 'Order placed successfully', 201);
  } catch (e) { resolve(e as Error, res); }
};
