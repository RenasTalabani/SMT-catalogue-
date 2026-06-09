import { Router, RequestHandler } from 'express';
import * as invoiceController from './invoice.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler);

// Generate invoice from an order
router.post(
  '/order/:orderId',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.createFromOrder as unknown as RequestHandler,
);

// List all invoices
router.get(
  '/',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.getAll as RequestHandler,
);

// Get single invoice detail
router.get(
  '/:id',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.getById as RequestHandler,
);

// Download PDF
router.get(
  '/:id/pdf',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.downloadPDF as unknown as RequestHandler,
);

// Preview PDF inline
router.get(
  '/:id/preview',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.previewPDF as unknown as RequestHandler,
);

// Mark invoice as paid
router.patch(
  '/:id/paid',
  restrictTo('super_admin', 'admin') as RequestHandler,
  invoiceController.markPaid as RequestHandler,
);

export default router;
