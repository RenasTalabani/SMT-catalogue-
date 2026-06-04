import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as scheduleService from './report-schedule.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  INVALID_REPORT_TYPE: { s: 400, m: 'Invalid report type. Use: DAILY_SALES, WEEKLY_INVENTORY, MONTHLY_PROFIT, LOW_STOCK' },
  NO_RECIPIENTS:       { s: 400, m: 'No recipients configured for this report type' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await scheduleService.getAll()); }
  catch (e) { resolve(e as Error, res); }
};

export const upsert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { type: string; frequency: string; recipients: string[]; isActive?: boolean };
    if (!b.type)                               { error(res, 'type is required', 400); return; }
    if (!b.frequency)                          { error(res, 'frequency is required', 400); return; }
    if (!Array.isArray(b.recipients) || !b.recipients.length) { error(res, 'recipients array required', 400); return; }

    success(res, await scheduleService.upsert({
      type:       b.type       as Parameters<typeof scheduleService.upsert>[0]['type'],
      frequency:  b.frequency  as Parameters<typeof scheduleService.upsert>[0]['frequency'],
      recipients: b.recipients,
      isActive:   b.isActive,
    }), 'Report schedule saved');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await scheduleService.remove(req.params['type']!);
    success(res, null, 'Report schedule deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const sendNow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { recipients?: string[] };
    const type = req.params['type'] as Parameters<typeof scheduleService.sendReport>[0];
    const result = await scheduleService.sendReport(type, b.recipients);
    success(res, result, result.sent ? `Report sent to ${result.recipientCount} recipient(s)` : 'SMTP not configured — report skipped');
  } catch (e) { resolve(e as Error, res); }
};
