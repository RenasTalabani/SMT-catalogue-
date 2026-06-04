import { Router, RequestHandler, Response } from 'express';
import { protect } from '../../shared/middlewares/auth.middleware';
import { AuthRequest } from '../../types';
import { success } from '../../shared/utils/response.util';
import * as wishlistService from './wishlist.service';

const router = Router();
router.use(protect as RequestHandler);

const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await wishlistService.getWishlist(req.user.id));
};
const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await wishlistService.addToWishlist(req.user.id, Number(req.params['productId'])), 'Added to wishlist'); }
  catch (e) { res.status(400).json({ success: false, message: (e as Error).message }); }
};
const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  await wishlistService.removeFromWishlist(req.user.id, Number(req.params['productId']));
  success(res, null, 'Removed from wishlist');
};
const clearWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  await wishlistService.clearWishlist(req.user.id);
  success(res, null, 'Wishlist cleared');
};
const checkWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, { inWishlist: await wishlistService.isInWishlist(req.user.id, Number(req.params['productId'])) });
};
const getRecent = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await wishlistService.getRecentlyViewed(req.user.id, req.query['limit'] ? Number(req.query['limit']) : 20));
};
const trackView = async (req: AuthRequest, res: Response): Promise<void> => {
  await wishlistService.trackView(req.user.id, Number(req.params['productId']));
  success(res, null, 'View tracked');
};

router.get('/',                    getWishlist         as unknown as RequestHandler);
router.post('/:productId',         addToWishlist       as unknown as RequestHandler);
router.delete('/:productId',       removeFromWishlist  as unknown as RequestHandler);
router.delete('/',                 clearWishlist       as unknown as RequestHandler);
router.get('/check/:productId',    checkWishlist       as unknown as RequestHandler);
router.get('/recent',              getRecent           as unknown as RequestHandler);
router.post('/viewed/:productId',  trackView           as unknown as RequestHandler);

export default router;
