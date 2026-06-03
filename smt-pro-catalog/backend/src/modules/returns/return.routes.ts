import { Router, RequestHandler } from 'express';
import * as returnController from './return.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  returnController.getStats as unknown as RequestHandler,
);

router.get('/',    returnController.getAll   as unknown as RequestHandler);
router.get('/:id', returnController.getById  as unknown as RequestHandler);

router.post('/',
  auditMiddleware('CREATE', 'ReturnRequest') as RequestHandler,
  returnController.create as unknown as RequestHandler,
);

router.patch('/:id/review',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('REVIEW', 'ReturnRequest') as RequestHandler,
  returnController.review as unknown as RequestHandler,
);

router.post('/:id/process',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('PROCESS', 'ReturnRequest') as RequestHandler,
  returnController.processReturn as unknown as RequestHandler,
);

export default router;
