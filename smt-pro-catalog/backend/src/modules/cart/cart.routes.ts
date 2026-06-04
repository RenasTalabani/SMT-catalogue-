import { Router, RequestHandler } from 'express';
import * as cartController from './cart.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();
router.use(protect as RequestHandler);

router.get('/',                    cartController.getCart    as unknown as RequestHandler);
router.post('/items',              cartController.addItem    as unknown as RequestHandler);
router.delete('/items/:itemId',    cartController.removeItem as unknown as RequestHandler);
router.delete('/',                 cartController.clearCart  as unknown as RequestHandler);

router.post('/checkout',
  auditMiddleware('CHECKOUT', 'Cart') as RequestHandler,
  cartController.checkout as unknown as RequestHandler,
);

export default router;
