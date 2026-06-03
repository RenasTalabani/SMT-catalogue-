import { Router, RequestHandler } from 'express';
import * as shiftController from './shift.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

// ── Registers ──────────────────────────────────────────────────────────────────
router.get('/registers', shiftController.getRegisters as unknown as RequestHandler);

router.post('/registers',
  restrictTo('super_admin', 'admin') as RequestHandler,
  shiftController.createRegister as unknown as RequestHandler,
);

router.put('/registers/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  shiftController.updateRegister as unknown as RequestHandler,
);

// ── Shifts ─────────────────────────────────────────────────────────────────────
router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  shiftController.getStats as unknown as RequestHandler,
);

router.get('/current/:registerId', shiftController.getCurrentShift as unknown as RequestHandler);
router.get('/',    shiftController.getAll   as unknown as RequestHandler);
router.get('/:id', shiftController.getById  as unknown as RequestHandler);

router.post('/open',
  auditMiddleware('OPEN', 'Shift') as RequestHandler,
  shiftController.openShift as unknown as RequestHandler,
);

router.post('/:id/close',
  auditMiddleware('CLOSE', 'Shift') as RequestHandler,
  shiftController.closeShift as unknown as RequestHandler,
);

router.post('/:id/orders',
  shiftController.addOrderToShift as unknown as RequestHandler,
);

export default router;
