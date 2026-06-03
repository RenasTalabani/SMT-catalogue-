import { Router, RequestHandler } from 'express';
import * as attrController from './attribute.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';

const router = Router();

// Public: definition list and product spec lookup
router.get('/definitions',                         attrController.getAllDefinitions       as RequestHandler);
router.get('/products/:productId',                 attrController.getProductAttributes   as RequestHandler);
router.post('/search',                             attrController.searchByAttributes     as RequestHandler);

// Admin definition management
router.post('/definitions',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  attrController.createDefinition as unknown as RequestHandler,
);
router.put('/definitions/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  attrController.updateDefinition as unknown as RequestHandler,
);
router.delete('/definitions/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  attrController.deleteDefinition as unknown as RequestHandler,
);

// Product attribute assignment
router.put('/products/:productId',
  protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  attrController.setProductAttributes as unknown as RequestHandler,
);
router.delete('/products/:productId/:attributeId',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  attrController.removeProductAttribute as unknown as RequestHandler,
);

export default router;
