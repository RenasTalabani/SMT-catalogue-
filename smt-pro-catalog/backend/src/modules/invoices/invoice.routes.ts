import { Router, RequestHandler } from 'express';
import * as invoiceController from './invoice.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

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

// Outstanding loans summary
router.get(
  '/loans',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.getOutstandingLoans as RequestHandler,
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

// Edit invoice items (admin only)
router.patch(
  '/:id/items',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'Invoice') as RequestHandler,
  invoiceController.editItems as RequestHandler,
);

// Edit invoice (admin only)
router.patch(
  '/:id/edit',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'Invoice') as RequestHandler,
  invoiceController.editInvoice as RequestHandler,
);

// Delete invoice (admin only)
router.delete(
  '/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Invoice') as RequestHandler,
  invoiceController.remove as RequestHandler,
);

// Mark invoice as paid
router.patch(
  '/:id/paid',
  restrictTo('super_admin', 'admin') as RequestHandler,
  invoiceController.markPaid as RequestHandler,
);

// Record a loan payment installment
router.post(
  '/:id/payment',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  invoiceController.addPayment as unknown as RequestHandler,
);

export default router;
