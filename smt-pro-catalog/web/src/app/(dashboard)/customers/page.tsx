'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, UserPlus, Phone, Mail, MapPin,
  Trash2, Edit2, X, ChevronRight, ShoppingCart, TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface Customer {
  id:        number;
  name:      string;
  phone:     string | null;
  email:     string | null;
  address:   string | null;
  notes:     string | null;
  createdAt: string;
}

interface CustomerStats {
  orderCount:   number;
  totalSpent:   number;
  recentOrders: Array<{ id: number; finalAmount: number; status: string; paymentMethod: string; createdAt: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export default function CustomersPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canDelete = user?.role === 'super_admin' || user?.role === 'admin';

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [selectedId, setSelected] = useState<number | null>(null);

  // List
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn:  () =>
      api.get(`/customers?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
         .then((r) => r.data.data),
  });

  const customers: Customer[] = data?.customers ?? [];
  const total: number         = data?.total      ?? 0;

  // Selected customer stats
  const { data: statsData } = useQuery<CustomerStats>({
    queryKey: ['customer-stats', selectedId],
    queryFn:  () => api.get(`/customers/${selectedId}/stats`).then((r) => r.data.data),
    enabled:  !!selectedId,
  });

  const selectedCustomer = customers.find((c) => c.id === selectedId);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => api.post('/customers', form).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer added'); closeForm(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/customers/${editId}`, form).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer updated'); closeForm(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer deleted'); if (selectedId === deleteMutation.variables) setSelected(null); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit   = (c: Customer) => { setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setEditId(c.id); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };
  const handleSave = () => editId ? updateMutation.mutate() : createMutation.mutate();
  const handleDelete = (c: Customer) => { if (!confirm(`Delete "${c.name}"?`)) return; deleteMutation.mutate(c.id); };

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} customer{total !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 btn-primary text-sm">
          <UserPlus size={15} /> Add Customer
        </button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit Customer' : 'New Customer'}</h2>
              <button type="button" onClick={closeForm} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>
            <input className="input w-full" placeholder="Full name *"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input w-full" placeholder="Phone number"
              value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="input w-full" type="email" placeholder="Email address"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input w-full" placeholder="Address"
              value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <textarea className="input w-full resize-none" rows={2} placeholder="Notes"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
              <button type="button" disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave} className="btn-primary text-sm">
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving…' : editId ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input className="input pl-9 w-full" placeholder="Search by name, phone or email…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Customer list */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading customers…</div>}
          {!isLoading && customers.length === 0 && (
            <div className="card p-12 text-center">
              <Users size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <p className="text-[#94A3B8]">No customers yet. Add your first one!</p>
            </div>
          )}
          {customers.map((c) => (
            <div key={c.id}
              onClick={() => setSelected(c.id === selectedId ? null : c.id)}
              className={`card rounded-2xl p-4 cursor-pointer transition-all border ${
                selectedId === c.id ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-dark-border'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold flex-shrink-0">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {c.phone && <span className="flex items-center gap-1 text-xs text-[#94A3B8]"><Phone size={10} />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1 text-xs text-[#94A3B8]"><Mail size={10} />{c.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors">
                    <Edit2 size={14} />
                  </button>
                  {canDelete && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                      className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronRight size={14} className={`text-[#94A3B8] transition-transform ${selectedId === c.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
              {c.address && (
                <p className="flex items-center gap-1 text-xs text-[#64748B] mt-2 ml-13">
                  <MapPin size={10} />{c.address}
                </p>
              )}
            </div>
          ))}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between pt-2">
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

        {/* Customer detail panel */}
        <div className="space-y-4">
          {!selectedCustomer ? (
            <div className="card p-8 text-center text-[#94A3B8] text-sm">
              <Users size={32} className="mx-auto mb-3 opacity-40" />
              Select a customer to view details
            </div>
          ) : (
            <>
              {/* Profile card */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand text-white text-lg font-bold">
                    {selectedCustomer.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold">{selectedCustomer.name}</p>
                    <p className="text-xs text-[#94A3B8]">Since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedCustomer.phone   && <p className="flex items-center gap-2 text-sm text-[#CBD5E1]"><Phone size={14} className="text-[#94A3B8]" />{selectedCustomer.phone}</p>}
                {selectedCustomer.email   && <p className="flex items-center gap-2 text-sm text-[#CBD5E1]"><Mail size={14} className="text-[#94A3B8]" />{selectedCustomer.email}</p>}
                {selectedCustomer.address && <p className="flex items-center gap-2 text-sm text-[#CBD5E1]"><MapPin size={14} className="text-[#94A3B8]" />{selectedCustomer.address}</p>}
                {selectedCustomer.notes   && <p className="text-xs text-[#64748B] italic border-t border-dark-border pt-2">{selectedCustomer.notes}</p>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <ShoppingCart size={18} className="mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-white">{statsData?.orderCount ?? '—'}</p>
                  <p className="text-xs text-[#94A3B8]">Orders</p>
                </div>
                <div className="card p-4 text-center">
                  <TrendingUp size={18} className="mx-auto text-green-400 mb-1" />
                  <p className="text-2xl font-bold text-white">
                    {statsData ? `$${statsData.totalSpent.toLocaleString()}` : '—'}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Total Spent</p>
                </div>
              </div>

              {/* Recent orders */}
              {statsData && statsData.recentOrders.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-dark-border">
                    <p className="text-sm font-semibold text-white">Recent Orders</p>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {statsData.recentOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm text-white font-medium">Order #{o.id}</p>
                          <p className="text-xs text-[#94A3B8]">{new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">${o.finalAmount.toFixed(2)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? ''}`}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
