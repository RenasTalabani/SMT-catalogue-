import { Router, RequestHandler, ErrorRequestHandler } from 'express';
import * as productController from './product.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';
import { validateProduct, validateProductUpdate } from './product.validation';
import { upload } from '../../config/cloudinary';

const router = Router();

const handleUploadError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err) { res.status(400).json({ status: 'error', message: (err as Error).message }); return; }
  next();
};

router.get('/',                  productController.getAll       as RequestHandler);
router.get('/barcode/:code',     productController.getByBarcode as RequestHandler);
router.get('/:id',               productController.getById      as RequestHandler);

router.post('/',
  protect as RequestHandler,
  restrictTo('admin', 'employee') as RequestHandler,
  upload.single('image'),
  handleUploadError,
  validateProduct,
  auditMiddleware('CREATE', 'Product') as RequestHandler,
  productController.create as RequestHandler,
);

router.put('/:id',
  protect as RequestHandler,
  restrictTo('admin', 'employee') as RequestHandler,
  upload.single('image'),
  handleUploadError,
  validateProductUpdate,
  auditMiddleware('UPDATE', 'Product') as RequestHandler,
  productController.update as RequestHandler,
);

router.get('/trash/list',
  protect as RequestHandler,
  restrictTo('admin') as RequestHandler,
  productController.getDeleted as RequestHandler,
);

router.patch('/:id/restore',
  protect as RequestHandler,
  restrictTo('admin') as RequestHandler,
  auditMiddleware('RESTORE', 'Product') as RequestHandler,
  productController.restore as RequestHandler,
);

router.delete('/:id',
  protect as RequestHandler,
  restrictTo('admin') as RequestHandler,
  auditMiddleware('DELETE', 'Product') as RequestHandler,
  productController.remove as RequestHandler,
);

router.delete('/:id/permanent',
  protect as RequestHandler,
  restrictTo('admin') as RequestHandler,
  auditMiddleware('PERMANENT_DELETE', 'Product') as RequestHandler,
  productController.permanentDelete as RequestHandler,
);

export default router;
