import { Router } from 'express';
import * as ctrl from './category.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { createRules, updateRules, listRules } from './category.validation';
import { RequestHandler } from 'express';

const router = Router();

router.get('/',    listRules, ctrl.list as RequestHandler);
router.get('/:id', ctrl.getOne as RequestHandler);

router.use(protect as RequestHandler);
router.post('/',     restrictTo('admin') as RequestHandler, createRules, ctrl.create as RequestHandler);
router.put('/:id',   restrictTo('admin') as RequestHandler, updateRules,  ctrl.update as RequestHandler);
router.delete('/:id', restrictTo('admin') as RequestHandler, ctrl.remove as RequestHandler);

export default router;
