import { Router, RequestHandler, Response } from 'express';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as reviewService from './review.service';

const router = Router();

const ERR_MAP: Record<string, { s: number; m: string }> = {
  INVALID_RATING:   { s: 400, m: 'Rating must be between 1 and 5' },
  PRODUCT_NOT_FOUND:{ s: 404, m: 'Product not found' },
  REVIEW_NOT_FOUND: { s: 404, m: 'Review not found' },
};
const resolve = (e: Error, res: Response) => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// Public endpoints
const getProductReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await reviewService.getProductReviews(
      Number(req.params['productId']),
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 10,
    ));
  } catch (e) { resolve(e as Error, res); }
};

const getTopRated = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await reviewService.getTopRated(
      q['limit']      ? Number(q['limit'])      : 10,
      q['minReviews'] ? Number(q['minReviews']) : 3,
    ));
  } catch (e) { resolve(e as Error, res); }
};

router.get('/top-rated',             getTopRated         as unknown as RequestHandler);
router.get('/product/:productId',    getProductReviews   as unknown as RequestHandler);

// Mark helpful / report (auth required)
const markHelpful = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await reviewService.markHelpful(Number(req.params['id'])); success(res, null, 'Marked as helpful'); }
  catch (e) { resolve(e as Error, res); }
};
const reportReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await reviewService.reportReview(Number(req.params['id'])); success(res, null, 'Review reported'); }
  catch (e) { resolve(e as Error, res); }
};

router.post('/:id/helpful', protect as RequestHandler, markHelpful  as unknown as RequestHandler);
router.post('/:id/report',  protect as RequestHandler, reportReview as unknown as RequestHandler);

// Submit / update own review
const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { productId: number; rating: number; title?: string; body?: string };
    if (!b.productId || !b.rating) { error(res, 'productId and rating are required', 400); return; }
    success(res, await reviewService.upsertReview(req.user.id, Number(b.productId), b), 'Review submitted — pending moderation');
  } catch (e) { resolve(e as Error, res); }
};
router.post('/', protect as RequestHandler, submitReview as unknown as RequestHandler);

// Admin moderation
const getPending = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await reviewService.getPending(q['page'] ? Number(q['page']) : 1, q['limit'] ? Number(q['limit']) : 20));
  } catch (e) { resolve(e as Error, res); }
};
const moderate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { approved: boolean };
    if (b.approved === undefined) { error(res, 'approved is required', 400); return; }
    const result = await reviewService.moderate(Number(req.params['id']), Boolean(b.approved));
    success(res, result, b.approved ? 'Review approved' : 'Review rejected and deleted');
  } catch (e) { resolve(e as Error, res); }
};
const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await reviewService.remove(Number(req.params['id'])); success(res, null, 'Review deleted'); }
  catch (e) { resolve(e as Error, res); }
};

router.get('/pending',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  getPending as unknown as RequestHandler,
);
router.patch('/:id/moderate',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  moderate as unknown as RequestHandler,
);
router.delete('/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  deleteReview as unknown as RequestHandler,
);

export default router;
