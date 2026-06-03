import { Router, RequestHandler } from 'express';
import * as noteController from './customer-note.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

// Overdue follow-ups across all customers
router.get('/overdue', noteController.getOverdue as unknown as RequestHandler);

// Per-customer
router.get('/:customerId',        noteController.getByCustomer    as unknown as RequestHandler);
router.get('/:customerId/stats',  noteController.getCustomerStats as unknown as RequestHandler);

router.post('/:customerId',
  noteController.create as unknown as RequestHandler,
);

router.put('/:customerId/notes/:noteId',
  noteController.update as unknown as RequestHandler,
);

router.patch('/:customerId/notes/:noteId/resolve',
  noteController.resolveNote as unknown as RequestHandler,
);

router.delete('/:customerId/notes/:noteId',
  noteController.remove as unknown as RequestHandler,
);

export default router;
