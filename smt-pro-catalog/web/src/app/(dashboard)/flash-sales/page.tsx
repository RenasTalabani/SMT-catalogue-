'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, X, Edit2, Trash2, Search, Clock, CheckCircle,
  XCircle, Calendar, Percent, Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface FlashSale {
  id:          number;
  title:       string;
  productId:   number | null;
  variantId:   number | null;
  categoryId:  number | null;
  salePrice:   number | null;
  discountPct: number | null;
  maxQuantity: number | null;
  soldCount:   number;
  isActive:    boolean;
  startAt:     string;
  endAt:       string;
  product?:    { id: number; name: string; price: number } | null;
  variant?:    { id: number; sku: string; price: number } | null;
  category?:   { id: number; name: string } | null;
}

interface FlashSaleStats {
  total: number; active: number; upcoming: number; expired: number;
  topSelling: Array<{ id: number; title: string; soldCount: number; maxQuantity: number | null }>;
}

const emptyForm = {
  title: '', productId: '', variantId: '', categoryId: '',
  salePrice: '', discountPct: '', maxQuantity: '', isActive: true,
  startAt: '', endAt: '',
};

function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function statusBadge(sale: FlashSale) {
  const now  = new Date();
  const from = new Date(sale.startAt);
  const to   = new Date(sale.endAt);
  if (!sale.isActive) return { label: 'Inactive', cls: 'bg-gray-500/20 text-gray-400' };
  if (now < from)     return { label: 'Upcoming', cls: 'bg-blue-500/20 text-blue-400' };
  if (now > to)       return { label: 'Expired',  cls: 'bg-red-500/20 text-red-400' };
  return { label: 'Live', cls: 'bg-green-500/20 text-green-400' };
}

export default function FlashSalesPage() {
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
    queryKey: ['flash-sales', page, activeOnly],
    queryFn:  () =>
      api.get(`/flash-sales?page=${page}&limit=20&activeOnly=${activeOnly}`)
         .then((r) => r.data.data),
  });

  const { data: stats } = useQuery<FlashSaleStats>({
    queryKey: ['flash-sales-stats'],
    queryFn:  () => api.get('/flash-sales/stats').then((r) => r.data.data),
  });

  const sales: FlashSale[] = data?.sales ?? [];
  const total: number      = data?.total  ?? 0;

  const filtered = search
    ? sales.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    : sales;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title:       form.title,
        productId:   form.productId   ? Number(form.productId)   : undefined,
        variantId:   form.variantId   ? Number(form.variantId)   : undefined,
        categoryId:  form.categoryId  ? Number(form.categoryId)  : undefined,
        salePrice:   form.salePrice   ? Number(form.salePrice)   : undefined,
        discountPct: form.discountPct ? Number(form.discountPct) : undefined,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        isActive:    form.isActive,
        startAt:     form.startAt,
        endAt:       form.endAt,
      };
      return editId
        ? api.put(`/flash-sales/${editId}`, payload).then((r) => r.data.data)
        : api.post('/flash-sales', payload).then((r) => r.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flash-sales'] });
      qc.invalidateQueries({ queryKey: ['flash-sales-stats'] });
      toast.success(editId ? 'Flash sale updated' : 'Flash sale created');
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flash-sales/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flash-sales'] });
      qc.invalidateQueries({ queryKey: ['flash-sales-stats'] });
      toast.success('Flash sale deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit   = (s: FlashSale) => {
    setForm({
      title:       s.title,
      productId:   s.productId  ? String(s.productId)  : '',
      variantId:   s.variantId  ? String(s.variantId)  : '',
      categoryId:  s.categoryId ? String(s.categoryId) : '',
      salePrice:   s.salePrice  ? String(s.salePrice)  : '',
      discountPct: s.discountPct ? String(s.discountPct) : '',
      maxQuantity: s.maxQuantity ? String(s.maxQuantity) : '',
      isActive:    s.isActive,
      startAt:     toDatetimeLocal(s.startAt),
      endAt:       toDatetimeLocal(s.endAt),
    });
    setEditId(s.id);
    setShowForm(true);
  };
  const closeForm  = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Flash Sales</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Time-limited promotional pricing</p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 btn-primary text-sm">
            <Plus size={15} /> New Flash Sale
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.total,    icon: Zap,         cls: 'text-primary' },
            { label: 'Live Now', value: stats.active,   icon: CheckCircle, cls: 'text-green-400' },
            { label: 'Upcoming', value: stats.upcoming, icon: Clock,       cls: 'text-blue-400' },
            { label: 'Expired',  value: stats.expired,  icon: XCircle,     cls: 'text-red-400' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center gap-3">
                <Icon size={20} className={cls} />
                <div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-[#94A3B8]">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input className="input pl-9 w-full" placeholder="Search flash sales…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button"
          onClick={() => { setActive((v) => !v); setPage(1); }}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors ${
            activeOnly
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'text-[#94A3B8] border-dark-border hover:text-white'
          }`}>
          <CheckCircle size={14} /> Live only
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Title', 'Target', 'Discount', 'Period', 'Sales', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
                {canWrite && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Zap size={36} className="mx-auto text-[#94A3B8] opacity-40 mb-2" />
                    <p className="text-[#94A3B8]">{search ? 'No results' : 'No flash sales yet'}</p>
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const badge = statusBadge(s);
                const target = s.product?.name ?? s.variant?.sku ?? s.category?.name ?? 'All products';
                return (
                  <tr key={s.id} className="hover:bg-dark-card/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{s.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[#94A3B8]">
                        <Tag size={12} />
                        <span className="truncate max-w-[120px]">{target}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {s.salePrice != null
                        ? `$${s.salePrice}`
                        : s.discountPct != null
                          ? <span className="flex items-center gap-1"><Percent size={12} />{s.discountPct}%</span>
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] text-xs">
                      <div className="flex items-center gap-1"><Calendar size={11} />{new Date(s.startAt).toLocaleDateString()}</div>
                      <div className="text-[#64748B]">→ {new Date(s.endAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {s.soldCount}{s.maxQuantity ? ` / ${s.maxQuantity}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" title="Edit" onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button type="button" title="Delete"
                            onClick={() => { if (confirm(`Delete "${s.title}"?`)) deleteMutation.mutate(s.id); }}
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

      {/* Create / Edit Modal */}
      {showForm && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg space-y-4 p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                {editId ? 'Edit Flash Sale' : 'New Flash Sale'}
              </h2>
              <button type="button" onClick={closeForm} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <input className="input w-full" placeholder="Title *" value={form.title} onChange={f('title')} />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Product ID</label>
                  <input className="input w-full" type="number" placeholder="optional" value={form.productId} onChange={f('productId')} />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Variant ID</label>
                  <input className="input w-full" type="number" placeholder="optional" value={form.variantId} onChange={f('variantId')} />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Category ID</label>
                  <input className="input w-full" type="number" placeholder="optional" value={form.categoryId} onChange={f('categoryId')} />
                </div>
              </div>
              <p className="text-xs text-[#64748B]">Leave all blank to apply to all products.</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Sale Price ($)</label>
                  <input className="input w-full" type="number" step="0.01" placeholder="e.g. 9.99" value={form.salePrice} onChange={f('salePrice')} />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Discount %</label>
                  <input className="input w-full" type="number" step="0.1" min="0" max="100" placeholder="e.g. 20" value={form.discountPct} onChange={f('discountPct')} />
                </div>
              </div>
              <p className="text-xs text-[#64748B]">Set either sale price OR discount %, not both.</p>

              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Max Quantity (optional)</label>
                <input className="input w-full" type="number" placeholder="Leave blank for unlimited" value={form.maxQuantity} onChange={f('maxQuantity')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Start *</label>
                  <input className="input w-full" type="datetime-local" value={form.startAt} onChange={f('startAt')} />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">End *</label>
                  <input className="input w-full" type="datetime-local" value={form.endAt} onChange={f('endAt')} />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-dark-border'}`}
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}>
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-[#CBD5E1]">Active</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={!form.title.trim() || !form.startAt || !form.endAt || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {saveMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Flash Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
