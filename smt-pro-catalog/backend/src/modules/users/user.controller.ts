import { Response } from 'express';
import { AuthRequest, UserRole } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import { ROLE_PERMISSIONS } from '../../shared/middlewares/rbac.middleware';
import * as userService from './user.service';

const VALID_ROLES: UserRole[] = ['super_admin', 'admin', 'employee', 'customer'];

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(String(req.query['page']  ?? 1)));
  const limit  = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? 20))));
  const search = req.query['search'] as string | undefined;
  const result = await userService.getAll(page, limit, search);
  success(res, result);
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  const user = await userService.getById(id);
  if (!user) { error(res, 'User not found', 404); return; }
  success(res, user);
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body as {
    name: string; email: string; password: string; role?: UserRole;
  };
  if (!name || !email || !password) { error(res, 'name, email and password are required', 400); return; }
  if (role && !VALID_ROLES.includes(role)) { error(res, 'Invalid role', 400); return; }
  try {
    const user = await userService.createUser(name, email, password, role ?? 'employee');
    success(res, user, 'Created', 201);
  } catch (e: unknown) {
    if ((e as Error).message === 'EMAIL_TAKEN') { error(res, 'Email already in use', 409); return; }
    throw e;
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const id   = parseInt(req.params['id'] ?? '0');
  const { name, email } = req.body as { name?: string; email?: string };
  try {
    const user = await userService.updateUser(id, { name, email });
    success(res, user);
  } catch (e: unknown) {
    if ((e as Error).message === 'EMAIL_TAKEN') { error(res, 'Email already in use', 409); return; }
    throw e;
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const id   = parseInt(req.params['id'] ?? '0');
  const { role } = req.body as { role: UserRole };
  if (!role || !VALID_ROLES.includes(role)) { error(res, 'Invalid role', 400); return; }
  if (id === req.user.id) { error(res, 'You cannot change your own role', 400); return; }
  const user = await userService.updateRole(id, role);
  success(res, user);
};

export const toggleActive = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  const { isActive } = req.body as { isActive: boolean };
  if (typeof isActive !== 'boolean') { error(res, 'isActive must be a boolean', 400); return; }
  if (id === req.user.id) { error(res, 'You cannot deactivate your own account', 400); return; }
  const user = await userService.toggleActive(id, isActive);
  success(res, user);
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  if (id === req.user.id) { error(res, 'You cannot delete your own account', 400); return; }
  await userService.deleteUser(id);
  res.status(204).send();
};

export const getPermissions = async (_req: AuthRequest, res: Response): Promise<void> => {
  success(res, ROLE_PERMISSIONS);
};

export const getRoleCounts = async (_req: AuthRequest, res: Response): Promise<void> => {
  const counts = await userService.getRoleCounts();
  success(res, counts);
};
