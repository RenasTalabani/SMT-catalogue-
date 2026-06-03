import { Router, RequestHandler } from 'express';
import multer from 'multer';
import * as importController from './product-import.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

router.get('/template', importController.getTemplate as unknown as RequestHandler);

router.post('/',
  upload.single('file'),
  importController.importProducts as unknown as RequestHandler,
);

export default router;
