import { Response, NextFunction } from 'express';
import { error } from '../utils/response.util';
import { AuthRequest, UserRole } from '../../types';

export type Permission =
  | 'full_system_access'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_products'
  | 'manage_categories'
  | 'manage_suppliers'
  | 'manage_orders'
  | 'manage_finance'
  | 'manage_reports'
  | 'view_audit_logs'
  | 'manage_settings'
  | 'delete_any_record'
  | 'view_products'
  | 'create_orders'
  | 'view_orders'
  | 'view_inventory'
  | 'browse_products'
  | 'track_orders';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'full_system_access',
    'manage_users',
    'manage_roles',
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_orders',
    'manage_finance',
    'manage_reports',
    'view_audit_logs',
    'manage_settings',
    'delete_any_record',
  ],
  admin: [
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_orders',
    'manage_finance',
    'manage_reports',
    'view_audit_logs',
  ],
  employee: [
    'view_products',
    'create_orders',
    'view_orders',
    'view_inventory',
  ],
  customer: [
    'browse_products',
    'track_orders',
  ],
};

export const restrictTo = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role as UserRole)) {
      error(res, 'You do not have permission to perform this action', 403);
      return;
    }
    next();
  };

export const hasPermission = (permission: Permission) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role as UserRole;
    const perms = ROLE_PERMISSIONS[role] ?? [];
    if (!perms.includes('full_system_access') && !perms.includes(permission)) {
      error(res, 'You do not have permission to perform this action', 403);
      return;
    }
    next();
  };
