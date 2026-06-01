import { Router, Request, Response } from 'express';
import * as shopService from './shop.service';
import { success, error } from '../../shared/utils/response.util';
import { body, validationResult } from 'express-validator';

const router = Router();

const ERR: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND:  { s: 404, m: 'One or more products not found' },
  INSUFFICIENT_STOCK: { s: 400, m: 'Insufficient stock for one or more items' },
};

const resolve = (e: Error, res: Response): Response => {
  const key = e.message.split(':')[0]!;
  const m   = ERR[key];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// GET /api/shop/products — public product listing
router.get('/products', async (req: Request, res: Response) => {
  try {
    success(res, await shopService.getPublicProducts({
      category: req.query['category'] as string | undefined,
      search:   req.query['search']   as string | undefined,
      page:     parseInt(String(req.query['page']  ?? 1)),
      limit:    parseInt(String(req.query['limit'] ?? 24)),
    }));
  } catch (e) { resolve(e as Error, res); }
});

// GET /api/shop/categories — public category listing
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    success(res, await shopService.getPublicCategories());
  } catch (e) { resolve(e as Error, res); }
});

// POST /api/shop/order — guest checkout (no auth required)
const validateGuestOrder = [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Phone is required'),
  body('paymentMethod').isIn(['CASH', 'CARD', 'TRANSFER']).withMessage('Invalid payment method'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

router.post('/order', validateGuestOrder, async (req: Request, res: Response) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ status: 'error', message: errs.array()[0]?.msg ?? 'Validation error' });
    return;
  }
  try {
    const result = await shopService.createGuestOrder(req.body as Parameters<typeof shopService.createGuestOrder>[0]);
    success(res, result, 'Order placed successfully', 201);
  } catch (e) { resolve(e as Error, res); }
});

export default router;
