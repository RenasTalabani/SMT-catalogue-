import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as svc from './category.service';
import { success, error } from '../../shared/utils/response.util';

const ERRORS: Record<string, [number, string]> = {
  CATEGORY_NOT_FOUND:           [404, 'Category not found'],
  PARENT_NOT_FOUND:             [404, 'Parent category not found'],
  SLUG_TAKEN:                   [409, 'A category with this slug already exists'],
  CATEGORY_HAS_PRODUCTS:        [409, 'Cannot delete a category that has products assigned'],
  CATEGORY_CANNOT_BE_OWN_PARENT:[400, 'A category cannot be its own parent'],
};

const resolveError = (e: Error, res: Response): Response => {
  const [status, msg] = ERRORS[e.message] ?? [500, 'Internal server error'];
  return error(res, msg, status);
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) { error(res, errs.array()[0]?.msg as string, 400); return; }

  const { tree, parentId, includeInactive } = req.query as Record<string, unknown>;
  try {
    if (tree) {
      success(res, await svc.getTree({ includeInactive: Boolean(includeInactive) }));
      return;
    }
    const pId = parentId !== undefined ? (parentId ? parseInt(String(parentId)) : null) : undefined;
    success(res, await svc.getFlat({ parentId: pId, includeInactive: Boolean(includeInactive) }));
  } catch (e) { resolveError(e as Error, res); }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const isSlug = isNaN(parseInt(req.params['id'] ?? ''));
    const data   = isSlug
      ? await svc.getBySlug(req.params['id']!)
      : await svc.getById(req.params['id']!);
    success(res, data);
  } catch (e) { resolveError(e as Error, res); }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) { error(res, errs.array()[0]?.msg as string, 400); return; }
  try {
    success(res, await svc.create(req.body as Record<string, unknown>), 'Category created', 201);
  } catch (e) { resolveError(e as Error, res); }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) { error(res, errs.array()[0]?.msg as string, 400); return; }
  try {
    success(res, await svc.update(req.params['id']!, req.body as Record<string, unknown>));
  } catch (e) { resolveError(e as Error, res); }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await svc.remove(req.params['id']!);
    success(res, null, 'Category deleted');
  } catch (e) { resolveError(e as Error, res); }
};
