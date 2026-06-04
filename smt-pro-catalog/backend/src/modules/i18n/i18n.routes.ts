import { Router, RequestHandler, Request, Response } from 'express';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { success, error } from '../../shared/utils/response.util';
import * as i18nService from './i18n.service';

const router = Router();

const resolve = (e: Error, res: Response) => {
  const map: Record<string, [string, number]> = {
    UNSUPPORTED_LOCALE:  ['Supported locales: ar, ku', 400],
    EN_NOT_TRANSLATABLE: ['English is the base language and cannot be translated', 400],
    PRODUCT_NOT_FOUND:   ['Product not found', 404],
    CATEGORY_NOT_FOUND:  ['Category not found', 404],
  };
  const [msg, status] = map[e.message] ?? [e.message, 500];
  return error(res, msg, status);
};

// Stats (admin)
router.get('/stats',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (_req: Request, res: Response) => {
    try { success(res, await i18nService.getTranslationStats()); }
    catch (e) { resolve(e as Error, res); }
  },
);

// Product translations
router.get('/products/:productId',
  async (req: Request, res: Response) => {
    try { success(res, await i18nService.getProductTranslations(Number(req.params['productId']))); }
    catch (e) { resolve(e as Error, res); }
  },
);

router.put('/products/:productId/:locale',
  protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const b = req.body as { name: string; description?: string };
      if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
      success(res, await i18nService.upsertProductTranslation(
        Number(req.params['productId']),
        req.params['locale'] as i18nService.Locale,
        b,
      ), 'Translation saved');
    } catch (e) { resolve(e as Error, res); }
  },
);

router.delete('/products/:productId/:locale',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      await i18nService.deleteProductTranslation(Number(req.params['productId']), req.params['locale'] as i18nService.Locale);
      success(res, null, 'Translation deleted');
    } catch (e) { resolve(e as Error, res); }
  },
);

// Category translations
router.get('/categories/:categoryId',
  async (req: Request, res: Response) => {
    try { success(res, await i18nService.getCategoryTranslations(Number(req.params['categoryId']))); }
    catch (e) { resolve(e as Error, res); }
  },
);

router.put('/categories/:categoryId/:locale',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const b = req.body as { name: string; description?: string };
      if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
      success(res, await i18nService.upsertCategoryTranslation(
        Number(req.params['categoryId']),
        req.params['locale'] as i18nService.Locale,
        b,
      ), 'Translation saved');
    } catch (e) { resolve(e as Error, res); }
  },
);

export default router;
