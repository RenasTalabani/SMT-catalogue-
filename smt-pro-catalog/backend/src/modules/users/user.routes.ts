import { Router, RequestHandler } from 'express';
import * as userController from './user.controller';
import { protect }        from '../../shared/middlewares/auth.middleware';
import { restrictTo }     from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler);

// Read — super_admin and admin
router.get('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  userController.getAll as unknown as RequestHandler,
);
router.get('/permissions',
  restrictTo('super_admin', 'admin') as RequestHandler,
  userController.getPermissions as unknown as RequestHandler,
);
router.get('/role-counts',
  restrictTo('super_admin', 'admin') as RequestHandler,
  userController.getRoleCounts as unknown as RequestHandler,
);
router.get('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  userController.getById as unknown as RequestHandler,
);

// Write — super_admin only
router.post('/',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('CREATE', 'User') as RequestHandler,
  userController.create as unknown as RequestHandler,
);
router.put('/:id',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('UPDATE', 'User') as RequestHandler,
  userController.update as unknown as RequestHandler,
);
router.put('/:id/role',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('UPDATE', 'User') as RequestHandler,
  userController.updateRole as unknown as RequestHandler,
);
router.put('/:id/active',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('UPDATE', 'User') as RequestHandler,
  userController.toggleActive as unknown as RequestHandler,
);
router.put('/:id/password',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'User') as RequestHandler,
  userController.resetPassword as unknown as RequestHandler,
);
router.delete('/:id',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('DELETE', 'User') as RequestHandler,
  userController.deleteUser as unknown as RequestHandler,
);

export default router;
