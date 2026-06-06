'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, X, Edit2, Trash2, Search, CheckCircle,
  XCircle, Percent, DollarSign, BarChart2, Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface Coupon {
  id:             number;
  code:           string;
  description:    string | null;
  type:           'PERCENTAGE' | 'FIXED';
  value:          number;
  minOrderAmount: number;
  maxUses:        number | null;
  usedCount:      number;
  isActive:       boolean;
  validFrom:      string;
  validUntil:     string | null;
  createdAt:      string;
  _count?:        { usages: number };
}

interface CouponStats {
  total:      number;
  active:     number;
  expired:    number;
  totalSaved: number;
  topCoupons: Array<{ id: number; code: string; type: string; value: number; usedCount: number }>;
}

const emptyForm = {
  code: '', description: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  value: '', minOrderAmount: '', maxUses: '',
  validFrom: '', validUntil: '', isActive: true,
};

function toDateInput(iso: string) { return iso ? iso.slice(0, 10) : ''; }

function statusOf(c: Coupon) {
  if (!c.isActive) return { label: 'Inactive', cls: 'bg-gray-500/20 text-gray-400' };
  const now = new Date();
  if (new Date(c.validFrom) > now) return { label: 'Scheduled', cls: 'bg-blue-500/20 text-blue-400' };
  if (c.validUntil && new Date(c.validUntil) < now) return { label: 'Expired', cls: 'bg-red-500/20 text-red-400' };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: 'Exhausted', cls: 'bg-orange-500/20 text-orange-400' };
  return { label: 'Active', cls: 'bg-green-500/20 text-green-400' };
}

export default function CouponsPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const canWrite = ['super_admin', 'admin'].includes(user?.role ?? '');

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [activeOnly, setActive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [form, setForm]         = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', page, search, activeOnly],
    queryFn:  () =>
      api.get(`/coupons?page=${page}&limit=20${search ? `&search=${search}` : ''}${activeOnly ? '&activeOnly=true' : ''}`)
         .then((r) => r.data.data),
  });

  const { data: stats } = useQuery<CouponStats>({
    queryKey: ['coupon-stats'],
    queryFn:  () => api.get('/coupons/stats').then((r) => r.data.data),
  });

  const coupons: Coupon[] = data?.coupons ?? [];
  const total: number     = data?.total   ?? 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code:           form.code.toUpperCase().trim(),
        description:    form.description || undefined,
        type:           form.type,
        value:          Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxUses:        form.maxUses ? Number(form.maxUses) : undefined,
        validFrom:      form.validFrom || undefined,
        validUntil:     form.validUntil || undefined,
        isActive:       form.isActive,
      };
      return editId
        ? api.put(`/coupons/${editId}`, payload).then((r) => r.data.data)
        : api.post('/coupons', payload).then((r) => r.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      qc.invalidateQueries({ queryKey: ['coupon-stats'] });
      toast.success(editId ? 'Coupon updated' : 'Coupon created');
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      qc.invalidateQueries({ queryKey: ['coupon-stats'] });
      toast.success('Coupon deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit   = (c: Coupon) => {
    setForm({
      code: c.code, description: c.description ?? '', type: c.type,
      value: String(c.value), minOrderAmount: String(c.minOrderAmount),
      maxUses: c.maxUses ? String(c.maxUses) : '',
      validFrom: toDateInput(c.validFrom), validUntil: c.validUntil ? toDateInput(c.validUntil) : '',
      isActive: c.isActive,
    });
    setEditId(c.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };
  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Coupons</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} coupon{total !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="flex items-center gap-2 btn-primary text-sm">
            <Plus size={15} /> New Coupon
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',   value: stats.total,      icon: Tag,       cls: 'text-primary' },
            { label: 'Active',  value: stats.active,     icon: CheckCircle, cls: 'text-green-400' },
            { label: 'Expired', value: stats.expired,    icon: XCircle,   cls: 'text-red-400' },
            { label: 'Savings Given', value: `$${stats.totalSaved.toLocaleString()}`, icon: DollarSign, cls: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <Icon size={20} className={cls} />
              <div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-[#94A3B8]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input className="input pl-9 w-full" placeholder="Search by code…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button type="button"
          onClick={() => { setActive((v) => !v); setPage(1); }}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors ${
            activeOnly ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'text-[#94A3B8] border-dark-border hover:text-white'
          }`}>
          <CheckCircle size={14} /> Active only
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Code', 'Type', 'Value', 'Min Order', 'Usage', 'Valid Until', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
                {canWrite && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!isLoading && coupons.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <Tag size={36} className="mx-auto text-[#94A3B8] opacity-40 mb-2" />
                  <p className="text-[#94A3B8]">{search ? 'No coupons match your search.' : 'No coupons yet.'}</p>
                </td></tr>
              )}
              {coupons.map((c) => {
                const s = statusOf(c);
                return (
                  <tr key={c.id} className="hover:bg-dark-card/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-mono font-bold">{c.code}</p>
                      {c.description && <p className="text-xs text-[#64748B] truncate max-w-[140px]">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-[#94A3B8]">
                        {c.type === 'PERCENTAGE' ? <Percent size={12} /> : <DollarSign size={12} />}
                        {c.type === 'PERCENTAGE' ? 'Percent' : 'Fixed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      {c.type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value}`}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">
                      {c.minOrderAmount > 0 ? `$${c.minOrderAmount}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-[#64748B]" />
                        <span className="text-white">{c.usedCount}</span>
                        {c.maxUses && <span className="text-[#64748B]">/ {c.maxUses}</span>}
                      </div>
                      {c.maxUses && (
                        <div className="mt-1 h-1 bg-dark-border rounded-full overflow-hidden w-16">
                          <div className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] text-xs">
                      {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button type="button"
                            onClick={() => { if (confirm(`Delete coupon "${c.code}"?`)) deleteMutation.mutate(c.id); }}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
            <p className="text-sm text-[#94A3B8]">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
                className="btn-secondary text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Top coupons */}
      {stats && stats.topCoupons.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            <p className="text-sm font-semibold text-white">Most Used</p>
          </div>
          <div className="divide-y divide-dark-border">
            {stats.topCoupons.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                <span className="text-[#64748B] text-sm w-5">#{i + 1}</span>
                <span className="text-white font-mono font-bold flex-1">{c.code}</span>
                <span className="text-[#94A3B8] text-sm">
                  {c.type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value}`}
                </span>
                <span className="text-white font-medium text-sm">{c.usedCount} uses</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button type="button" onClick={closeForm} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Code *</label>
                <input className="input w-full uppercase" placeholder="SUMMER20" value={form.code} onChange={f('code')} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Type *</label>
                <select className="input w-full" value={form.type} onChange={f('type')}>
                  <option value="PERCENTAGE">Percentage %</option>
                  <option value="FIXED">Fixed $</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">
                  Value * {form.type === 'PERCENTAGE' ? '(%)' : '($)'}
                </label>
                <input className="input w-full" type="number" step="0.01" min="0" value={form.value} onChange={f('value')} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Min Order ($)</label>
                <input className="input w-full" type="number" step="0.01" min="0" placeholder="0" value={form.minOrderAmount} onChange={f('minOrderAmount')} />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Max Uses (blank = unlimited)</label>
              <input className="input w-full" type="number" min="1" placeholder="e.g. 100" value={form.maxUses} onChange={f('maxUses')} />
            </div>

            <input className="input w-full" placeholder="Description (optional)" value={form.description} onChange={f('description')} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Valid From</label>
                <input className="input w-full" type="date" value={form.validFrom} onChange={f('validFrom')} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Valid Until</label>
                <input className="input w-full" type="date" value={form.validUntil} onChange={f('validUntil')} />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-dark-border'}`}
                onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}>
                <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-[#CBD5E1]">Active</span>
            </label>

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={!form.code.trim() || !form.value || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {saveMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
