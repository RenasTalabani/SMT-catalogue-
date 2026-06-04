import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as homeService from './home.service';

const resolve = (e: Error, res: Response): Response =>
  error(res, e.message === 'BANNER_NOT_FOUND' ? 'Banner not found' : e.message,
        e.message === 'BANNER_NOT_FOUND' ? 404 : 500);

export const getHomeScreen = async (_req: Request, res: Response): Promise<void> => {
  try { success(res, await homeService.getHomeScreen()); }
  catch (e) { resolve(e as Error, res); }
};

export const getBestSellers = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await homeService.getBestSellers(req.query['limit'] ? Number(req.query['limit']) : 20)); }
  catch (e) { resolve(e as Error, res); }
};

export const getBanners = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await homeService.getBanners((req.query as Record<string, string>)['type'])); }
  catch (e) { resolve(e as Error, res); }
};

export const createBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof homeService.createBanner>[0];
    if (!b.title?.trim() || !b.imageUrl?.trim()) { error(res, 'title and imageUrl are required', 400); return; }
    success(res, await homeService.createBanner(b), 'Banner created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await homeService.updateBanner(Number(req.params['id']), req.body as Parameters<typeof homeService.updateBanner>[1]), 'Banner updated'); }
  catch (e) { resolve(e as Error, res); }
};

export const deleteBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await homeService.deleteBanner(Number(req.params['id'])); success(res, null, 'Banner deleted'); }
  catch (e) { resolve(e as Error, res); }
};
