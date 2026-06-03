import { Router, RequestHandler } from 'express';
import * as budgetController from './budget.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

router.get('/dashboard', budgetController.getDashboard as unknown as RequestHandler);
router.get('/:id',       budgetController.getById      as unknown as RequestHandler);
router.post('/',         budgetController.create        as unknown as RequestHandler);
router.put('/:id',       budgetController.update        as unknown as RequestHandler);
router.delete('/:id',    budgetController.remove        as unknown as RequestHandler);

export default router;
