import { Router, RequestHandler } from 'express';
import * as ratingController from './supplier-rating.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/leaderboard', ratingController.getLeaderboard as unknown as RequestHandler);
router.get('/supplier/:supplierId/stats', ratingController.getSupplierStats as unknown as RequestHandler);

router.get('/',    ratingController.getAll   as unknown as RequestHandler);
router.get('/:id', ratingController.getById  as unknown as RequestHandler);

router.post('/',
  auditMiddleware('CREATE', 'SupplierRating') as RequestHandler,
  ratingController.create as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'SupplierRating') as RequestHandler,
  ratingController.remove as unknown as RequestHandler,
);

export default router;
