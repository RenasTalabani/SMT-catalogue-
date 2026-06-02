'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, UserPlus, Shield, ShieldCheck, ShieldOff,
  Trash2, ToggleLeft, ToggleRight, ChevronDown, KeyRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface UserItem {
  id:          number;
  name:        string;
  email:       string;
  role:        string;
  isActive:    boolean;
  lastLoginAt: string | null;
  createdAt:   string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  admin:       'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  employee:    'bg-green-500/20 text-green-400 border border-green-500/30',
  customer:    'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <ShieldCheck size={12} />,
  admin:       <Shield size={12} />,
  employee:    <Users size={12} />,
  customer:    <ShieldOff size={12} />,
};

const ALL_ROLES = ['super_admin', 'admin', 'employee', 'customer'] as const;

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [showCreate, setCreate]       = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm]               = useState({ name: '', email: '', password: '', role: 'employee' });

  const isSuperAdmin = me?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn:  () =>
      api.get(`/users?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
         .then((r) => r.data.data),
  });

  const users: UserItem[] = data?.users ?? [];
  const total: number     = data?.total  ?? 0;

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.put(`/users/${id}/role`, { role }).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Role updated'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/users/${id}/active`, { isActive }).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Status updated'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.put(`/users/${id}/password`, { password }).then((r) => r.data),
    onSuccess: () => { toast.success('Password reset successfully'); setResetUserId(null); setNewPassword(''); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/users', form).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setCreate(false);
      setForm({ name: '', email: '', password: '', role: 'employee' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = (u: UserItem) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(u.id);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} user{total !== 1 ? 's' : ''} total</p>
        </div>
        {isSuperAdmin && (
          <button type="button" onClick={() => setCreate(true)}
            className="flex items-center gap-2 btn-primary text-sm">
            <UserPlus size={15} /> Add User
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-bold text-white">Create New User</h2>
            <input className="input w-full" placeholder="Full name"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input w-full" type="email" placeholder="Email"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input w-full" type="password" placeholder="Password (min 8 chars)"
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <select className="input w-full"
              value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setCreate(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button" disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()} className="btn-primary text-sm">
                {createMutation.isPending ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password modal */}
      {resetUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound size={18} className="text-primary" /> Reset Password
            </h2>
            <p className="text-sm text-[#94A3B8]">Enter a new password for this user (min 8 characters).</p>
            <input className="input w-full" type="password" placeholder="New password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setResetUserId(null); setNewPassword(''); }}
                className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={newPassword.length < 8 || resetPasswordMutation.isPending}
                onClick={() => resetPasswordMutation.mutate({ id: resetUserId, password: newPassword })}
                className="btn-primary text-sm disabled:opacity-40">
                {resetPasswordMutation.isPending ? 'Saving…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input className="input pl-9 w-full" placeholder="Search by name or email…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Loading / empty */}
      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading users…</div>}
      {!isLoading && users.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-[#94A3B8] mb-3" />
          <p className="text-[#94A3B8]">No users found.</p>
        </div>
      )}

      {/* Mobile cards */}
      {!isLoading && users.length > 0 && (
        <div className="space-y-3 md:hidden">
          {users.map((u) => (
            <div key={u.id} className="card rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{u.name}</p>
                  <p className="text-xs text-[#94A3B8] truncate">{u.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ROLE_COLORS[u.role] ?? ''}`}>
                  {ROLE_ICONS[u.role]}{u.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
                {isSuperAdmin && u.id !== me?.id && (
                  <>
                    <select value={u.role} title="Change role" aria-label="Change role"
                      onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                      className="input text-xs py-0.5 flex-1">
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                    <button type="button" title={u.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => activeMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-yellow-400 transition-colors">
                      {u.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    <button type="button" title="Delete user"
                      onClick={() => handleDelete(u)}
                      className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && users.length > 0 && (
        <div className="card overflow-hidden hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Joined', isSuperAdmin ? 'Actions' : ''].filter(Boolean).map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[#94A3B8] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dark-border/50 hover:bg-dark-card/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand text-white text-xs font-bold">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{u.name}</span>
                      {u.id === me?.id && <span className="text-[10px] text-primary">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{u.email}</td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && u.id !== me?.id ? (
                      <div className="relative inline-flex items-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                          {ROLE_ICONS[u.role]}
                          <select value={u.role} aria-label="Change role"
                            onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                            className="bg-transparent border-none outline-none text-xs cursor-pointer pr-4 appearance-none">
                            {ALL_ROLES.map((r) => <option key={r} value={r} className="bg-dark-surface text-white">{r.replace('_', ' ')}</option>)}
                          </select>
                          <ChevronDown size={10} className="pointer-events-none" />
                        </span>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                        {ROLE_ICONS[u.role]}{u.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      {u.id !== me?.id && (
                        <div className="flex items-center gap-1 justify-end">
                          <button type="button" title="Reset password"
                            onClick={() => { setResetUserId(u.id); setNewPassword(''); }}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors">
                            <KeyRound size={15} />
                          </button>
                          <button type="button" title={u.isActive ? 'Deactivate user' : 'Activate user'}
                            onClick={() => activeMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-yellow-400 transition-colors">
                            {u.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                          <button type="button" title="Delete user"
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
              className="btn-secondary text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
