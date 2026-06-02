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

export const getEmployeePerformance = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getEmployeePerformance(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getProfitAnalytics = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await reportsService.getProfitAnalytics(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const exportAuditCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await reportsService.exportAuditLogs(req.query as Record<string, string>);
    const header = 'ID,Date,Action,Entity,EntityID,User,Role,IP\n';
    const rows = logs.map((l) =>
      [
        l.id,
        new Date(l.createdAt).toISOString(),
        l.action,
        l.entity,
        l.entityId ?? '',
        `"${l.user.name}"`,
        l.user.role,
        l.ipAddress ?? '',
      ].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);
    res.send(header + rows);
  } catch (e) { resolve(e as Error, res); }
};
