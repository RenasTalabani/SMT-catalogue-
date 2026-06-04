import { Router, RequestHandler, Response, Request } from 'express';
import { protect } from '../../shared/middlewares/auth.middleware';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as shopService from './customer-auth.service';

const router = Router();

const resolve = (e: Error, res: Response) => {
  if (e.message === 'EMAIL_TAKEN')      return error(res, 'Email is already registered', 409);
  if (e.message === 'PRODUCT_NOT_FOUND') return error(res, 'Product not found', 404);
  if (e.message === 'USER_NOT_FOUND')    return error(res, 'User not found', 404);
  return error(res, e.message, 500);
};

// ── Public endpoints ───────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const b = req.body as { name: string; email: string; password: string; phone?: string; address?: string };
    if (!b.name?.trim() || !b.email?.trim() || !b.password) { error(res, 'name, email and password are required', 400); return; }
    success(res, await shopService.register(b), 'Account created successfully', 201);
  } catch (e) { resolve(e as Error, res); }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await shopService.listProducts({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      search:     q['search'],
      category:   q['category'],
      categoryId: q['categoryId'] ? Number(q['categoryId']) : undefined,
      tag:        q['tag'],
      minPrice:   q['minPrice']   ? Number(q['minPrice'])   : undefined,
      maxPrice:   q['maxPrice']   ? Number(q['maxPrice'])   : undefined,
      inStock:    q['inStock']    === 'true',
      sortBy:     q['sortBy']     as 'price_asc' | 'price_desc' | 'newest' | undefined,
    }));
  } catch (e) { resolve(e as Error, res); }
});

router.get('/products/:idOrSku', async (req: Request, res: Response) => {
  try { success(res, await shopService.getProductDetail(req.params['idOrSku']!)); }
  catch (e) { resolve(e as Error, res); }
});

router.get('/categories', async (_req: Request, res: Response) => {
  try { success(res, await shopService.getCategoryTree()); }
  catch (e) { resolve(e as Error, res); }
});

// ── Auth-required customer endpoints ──────────────────────────────────────────
const getProfile  = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await shopService.getProfile(req.user.id)); }
  catch (e) { resolve(e as Error, res); }
};
const putProfile  = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await shopService.updateProfile(req.user.id, req.body as { name?: string; phone?: string; address?: string }), 'Profile updated'); }
  catch (e) { resolve(e as Error, res); }
};
router.get('/profile', protect as RequestHandler, getProfile  as unknown as RequestHandler);
router.put('/profile', protect as RequestHandler, putProfile  as unknown as RequestHandler);

export default router;
