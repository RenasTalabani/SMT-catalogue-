import { Router, RequestHandler } from 'express';
import * as boController  from './backorder.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  boController.getStats as unknown as RequestHandler,
);

router.get('/',    boController.getAll   as unknown as RequestHandler);
router.get('/:id', boController.getById  as unknown as RequestHandler);

router.post('/',
  auditMiddleware('CREATE', 'BackorderRequest') as RequestHandler,
  boController.create as unknown as RequestHandler,
);

router.patch('/:id/cancel',
  auditMiddleware('CANCEL', 'BackorderRequest') as RequestHandler,
  boController.cancel as unknown as RequestHandler,
);

export default router;
