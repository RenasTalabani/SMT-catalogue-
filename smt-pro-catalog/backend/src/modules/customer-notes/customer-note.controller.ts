import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as noteService from './customer-note.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  CUSTOMER_NOT_FOUND: { s: 404, m: 'Customer not found' },
  NOTE_NOT_FOUND:     { s: 404, m: 'Note not found' },
  NOTE_UNAUTHORIZED:  { s: 403, m: 'You can only edit your own notes' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getByCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await noteService.getByCustomer(
      Number(req.params['customerId']),
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 30,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const getOverdue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await noteService.getOverdueFollowUps(
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 20,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const getCustomerStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await noteService.getCustomerStats(Number(req.params['customerId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { type?: string; content: string; followUpAt?: string };
    if (!b.content?.trim()) { error(res, 'content is required', 400); return; }
    success(res, await noteService.create(
      Number(req.params['customerId']),
      req.user.id,
      { type: b.type as Parameters<typeof noteService.create>[2]['type'], content: b.content, followUpAt: b.followUpAt },
    ), 'Note added', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await noteService.update(
      Number(req.params['noteId']),
      req.user.id,
      req.body as Parameters<typeof noteService.update>[2],
    ), 'Note updated');
  } catch (e) { resolve(e as Error, res); }
};

export const resolveNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await noteService.resolve(Number(req.params['noteId'])), 'Follow-up resolved'); }
  catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role as string);
    await noteService.remove(Number(req.params['noteId']), req.user.id, isAdmin);
    success(res, null, 'Note deleted');
  } catch (e) { resolve(e as Error, res); }
};
