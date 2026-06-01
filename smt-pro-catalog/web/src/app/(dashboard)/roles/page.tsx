'use client';
import { useQuery } from '@tanstack/react-query';
import { Shield, ShieldCheck, Users, ShieldOff, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Permission = string;
type PermissionsMap = Record<string, Permission[]>;

const ROLE_META: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  super_admin: {
    label:       'Super Admin',
    color:       'text-purple-400 border-purple-500/30 bg-purple-500/10',
    icon:        <ShieldCheck size={18} />,
    description: 'Full system access. Can manage users, roles, and all platform settings.',
  },
  admin: {
    label:       'Admin',
    color:       'text-blue-400 border-blue-500/30 bg-blue-500/10',
    icon:        <Shield size={18} />,
    description: 'Manages products, orders, finance, and reports. Cannot manage users or system settings.',
  },
  employee: {
    label:       'Employee',
    color:       'text-green-400 border-green-500/30 bg-green-500/10',
    icon:        <Users size={18} />,
    description: 'Can view products, create and view orders, and manage inventory.',
  },
  customer: {
    label:       'Customer',
    color:       'text-gray-400 border-gray-500/30 bg-gray-500/10',
    icon:        <ShieldOff size={18} />,
    description: 'Public-facing role. Can browse products and track their own orders.',
  },
};

const PERMISSION_LABELS: Record<string, string> = {
  full_system_access: 'Full System Access',
  manage_users:       'Manage Users',
  manage_roles:       'Manage Roles',
  manage_products:    'Manage Products',
  manage_categories:  'Manage Categories',
  manage_suppliers:   'Manage Suppliers',
  manage_orders:      'Manage Orders',
  manage_finance:     'Manage Finance',
  manage_reports:     'Manage Reports',
  view_audit_logs:    'View Audit Logs',
  manage_settings:    'Manage Settings',
  delete_any_record:  'Delete Any Record',
  view_products:      'View Products',
  create_orders:      'Create Orders',
  view_orders:        'View Orders',
  view_inventory:     'View Inventory',
  browse_products:    'Browse Products (Public)',
  track_orders:       'Track Orders (Public)',
};

const PERMISSION_GROUPS: { label: string; perms: string[] }[] = [
  { label: 'System',    perms: ['full_system_access', 'manage_users', 'manage_roles', 'manage_settings', 'delete_any_record'] },
  { label: 'Finance',   perms: ['manage_finance', 'manage_reports', 'view_audit_logs'] },
  { label: 'Catalog',   perms: ['manage_products', 'manage_categories', 'manage_suppliers'] },
  { label: 'Orders',    perms: ['manage_orders', 'create_orders', 'view_orders'] },
  { label: 'Inventory', perms: ['view_inventory'] },
  { label: 'Products',  perms: ['view_products'] },
  { label: 'Public',    perms: ['browse_products', 'track_orders'] },
];

const ROLE_ORDER = ['super_admin', 'admin', 'employee', 'customer'];

export default function RolesPage() {
  const { user: me } = useAuthStore();

  const { data: permissionsMap, isLoading } = useQuery<PermissionsMap>({
    queryKey: ['permissions'],
    queryFn:  () => api.get('/users/permissions').then((r) => r.data.data),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-[#94A3B8]">Loading role permissions…</div>;
  }

  const map = permissionsMap ?? {};
  const allPerms = PERMISSION_GROUPS.flatMap((g) => g.perms);

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Permission matrix for all system roles</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLE_ORDER.map((role) => {
          const meta  = ROLE_META[role];
          const perms = map[role] ?? [];
          if (!meta) return null;
          return (
            <div key={role} className={`card rounded-2xl p-4 border ${meta.color}`}>
              <div className="flex items-center gap-2 mb-2">
                {meta.icon}
                <span className="font-bold text-sm">{meta.label}</span>
                {me?.role === role && (
                  <span className="ml-auto text-[10px] opacity-60">(you)</span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">{meta.description}</p>
              <div className="text-xs font-semibold opacity-60">
                {perms.includes('full_system_access')
                  ? 'All permissions'
                  : `${perms.length} permission${perms.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission matrix — grouped */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-white">Permission Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium min-w-[200px]">Permission</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-4 py-3 text-center font-medium min-w-[120px]">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${ROLE_META[role]?.color ?? ''}`}>
                      {ROLE_META[role]?.icon}
                      {ROLE_META[role]?.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <>
                  <tr key={`group-${group.label}`} className="bg-dark-card/30">
                    <td colSpan={ROLE_ORDER.length + 1} className="px-4 py-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                      {group.label}
                    </td>
                  </tr>
                  {group.perms.map((perm) => (
                    <tr key={perm} className="border-b border-dark-border/30 hover:bg-dark-card/20 transition-colors">
                      <td className="px-4 py-2.5 text-[#CBD5E1]">
                        {PERMISSION_LABELS[perm] ?? perm}
                      </td>
                      {ROLE_ORDER.map((role) => {
                        const rolePerms = map[role] ?? [];
                        const has = rolePerms.includes('full_system_access') || rolePerms.includes(perm);
                        return (
                          <td key={role} className="px-4 py-2.5 text-center">
                            {has
                              ? <Check size={16} className="mx-auto text-green-400" />
                              : <X    size={16} className="mx-auto text-dark-border" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
