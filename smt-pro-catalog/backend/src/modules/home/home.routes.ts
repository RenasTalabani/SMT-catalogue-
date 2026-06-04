import { Router, RequestHandler } from 'express';
import * as homeController from './home.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

// Public
router.get('/',            homeController.getHomeScreen as RequestHandler);
router.get('/best-sellers', homeController.getBestSellers as RequestHandler);
router.get('/banners',     homeController.getBanners     as RequestHandler);

// Admin only
router.post('/banners',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  homeController.createBanner as unknown as RequestHandler,
);
router.put('/banners/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  homeController.updateBanner as unknown as RequestHandler,
);
router.delete('/banners/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  homeController.deleteBanner as unknown as RequestHandler,
);

export default router;
