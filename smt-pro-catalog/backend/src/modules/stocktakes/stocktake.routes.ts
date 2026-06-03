import { Router, RequestHandler } from 'express';
import * as stocktakeController from './stocktake.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  stocktakeController.getStats as unknown as RequestHandler,
);

router.get('/',    stocktakeController.getAll   as unknown as RequestHandler);
router.get('/:id', stocktakeController.getById  as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'Stocktake') as RequestHandler,
  stocktakeController.create as unknown as RequestHandler,
);

router.patch('/:id/start',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('START', 'Stocktake') as RequestHandler,
  stocktakeController.start as unknown as RequestHandler,
);

router.put('/:id/counts',
  auditMiddleware('UPDATE', 'Stocktake') as RequestHandler,
  stocktakeController.updateCounts as unknown as RequestHandler,
);

router.post('/:id/complete',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('COMPLETE', 'Stocktake') as RequestHandler,
  stocktakeController.complete as unknown as RequestHandler,
);

router.patch('/:id/cancel',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CANCEL', 'Stocktake') as RequestHandler,
  stocktakeController.cancel as unknown as RequestHandler,
);

export default router;
