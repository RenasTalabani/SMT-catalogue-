import { Response } from 'express';
import * as financeService from './finance.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest } from '../../types';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  EXPENSE_NOT_FOUND: { s: 404, m: 'Expense not found' },
  INCOME_NOT_FOUND:  { s: 404, m: 'Income record not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await financeService.getExpenses(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, category, notes } = req.body as { amount: number; category: string; notes?: string };
    success(res, await financeService.createExpense(req.user.id, { amount, category, notes }), 'Expense recorded', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await financeService.deleteExpense(req.params['id']!);
    success(res, null, 'Expense deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const getIncomes = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await financeService.getIncomes(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const createIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, source, notes } = req.body as { amount: number; source: string; notes?: string };
    success(res, await financeService.createIncome(req.user.id, { amount, source, notes }), 'Income recorded', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const deleteIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await financeService.deleteIncome(req.params['id']!);
    success(res, null, 'Income record deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const getProfitLoss = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await financeService.getProfitLoss(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await financeService.getSummary()); }
  catch (e) { resolve(e as Error, res); }
};
