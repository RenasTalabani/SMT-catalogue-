import { Request, Response } from 'express';
import * as reportsService from './reports.service';
import { success, error } from '../../shared/utils/response.util';

const resolve = (e: Error, res: Response): Response => error(res, e.message, 500);

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getDashboard()); }
  catch (e) { resolve(e as Error, res); }
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getSalesAnalytics(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getTopProducts(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getCategoryBreakdown = async (_req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getCategoryBreakdown()); }
  catch (e) { resolve(e as Error, res); }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getAuditLogs(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};
