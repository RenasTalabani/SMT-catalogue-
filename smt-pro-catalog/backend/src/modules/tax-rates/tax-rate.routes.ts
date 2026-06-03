import { Router, RequestHandler } from 'express';
import * as taxController from './tax-rate.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/default',  taxController.getDefault  as unknown as RequestHandler);
router.get('/calculate', taxController.calculate  as unknown as RequestHandler);
router.get('/report',
  restrictTo('super_admin', 'admin') as RequestHandler,
  taxController.getReport as unknown as RequestHandler,
);
router.get('/', taxController.getAll as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  taxController.create as unknown as RequestHandler,
);
router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  taxController.update as unknown as RequestHandler,
);
router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  taxController.remove as unknown as RequestHandler,
);

export default router;
