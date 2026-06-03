import { Router, RequestHandler } from 'express';
import * as tagController from './tag.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

// Public tag reads (for shop/catalogue filtering)
router.get('/',                    tagController.getAll           as RequestHandler);
router.get('/:id',                 tagController.getById          as RequestHandler);
router.get('/slug/:slug/products', tagController.getProductsByTag as RequestHandler);

// Admin tag management
router.post('/',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'Tag') as RequestHandler,
  tagController.create as unknown as RequestHandler,
);

router.put('/:id',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'Tag') as RequestHandler,
  tagController.update as unknown as RequestHandler,
);

router.delete('/:id',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Tag') as RequestHandler,
  tagController.remove as unknown as RequestHandler,
);

// Product tag assignment
router.put('/products/:productId/tags',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  tagController.setProductTags as unknown as RequestHandler,
);

router.post('/products/:productId/tags/:tagId',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  tagController.addTag as unknown as RequestHandler,
);

router.delete('/products/:productId/tags/:tagId',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  tagController.removeTag as unknown as RequestHandler,
);

// Bulk tag multiple products
router.post('/bulk',
  protect as RequestHandler,
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('BULK_TAG', 'Tag') as RequestHandler,
  tagController.bulkTag as unknown as RequestHandler,
);

export default router;
