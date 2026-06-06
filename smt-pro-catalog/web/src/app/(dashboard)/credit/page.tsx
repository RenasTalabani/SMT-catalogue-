'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Search, Plus, X, AlertCircle,
  CheckCircle, TrendingUp, DollarSign, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface CreditAccount {
  id:          number;
  customerId:  number;
  creditLimit: number;
  balance:     number;
  totalDebt:   number;
  totalPaid:   number;
  status:      string;
  notes:       string | null;
  customer:    { id: number; name: string; email: string | null; phone: string | null };
  payments?:   CreditPayment[];
  outstandingOrders?: OutstandingOrder[];
}

interface CreditPayment {
  id:         number;
  amount:     number;
  method:     string;
  reference:  string | null;
  notes:      string | null;
  createdAt:  string;
  order?:     { id: number; finalAmount: number } | null;
  recordedByUser: { id: number; name: string };
}

interface OutstandingOrder {
  id:              number;
  finalAmount:     number;
  paidAmount:      number;
  remainingAmount: number;
  paymentStatus:   string;
  createdAt:       string;
}

interface CreditSummary {
  accounts: CreditAccount[];
  total:    number;
  page:     number;
  limit:    number;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', CARD: 'Card',
};

const PAY_STATUS_CLS: Record<string, string> = {
  UNPAID:  'bg-red-500/20 text-red-400',
  PARTIAL: 'bg-yellow-500/20 text-yellow-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  PAID:    'bg-green-500/20 text-green-400',
};

export default function CreditPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const canWrite = ['super_admin', 'admin'].includes(user?.role ?? '');

  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [selectedCustId, setSelected] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showLimit, setShowLimit]     = useState(false);
  const [payForm, setPayForm]   = useState({ amount: '', method: 'CASH', reference: '', notes: '', orderId: '' });
  const [limitForm, setLimitForm] = useState({ creditLimit: '', notes: '' });

  const { data, isLoading } = useQuery<CreditSummary>({
    queryKey: ['credit-accounts', page, search],
    queryFn:  () =>
      api.get(`/credit?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
         .then((r) => r.data.data),
  });

  const { data: detail } = useQuery<CreditAccount>({
    queryKey: ['credit-detail', selectedCustId],
    queryFn:  () => api.get(`/credit/${selectedCustId}`).then((r) => r.data.data),
    enabled:  !!selectedCustId,
  });

  const accounts: CreditAccount[] = data?.accounts ?? [];
  const total: number             = data?.total    ?? 0;

  const paymentMutation = useMutation({
    mutationFn: () => api.post(`/credit/${selectedCustId}/payment`, {
      amount:    Number(payForm.amount),
      method:    payForm.method,
      reference: payForm.reference || undefined,
      notes:     payForm.notes     || undefined,
      orderId:   payForm.orderId   ? Number(payForm.orderId) : undefined,
    }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-accounts'] });
      qc.invalidateQueries({ queryKey: ['credit-detail', selectedCustId] });
      toast.success('Payment recorded');
      setShowPayment(false);
      setPayForm({ amount: '', method: 'CASH', reference: '', notes: '', orderId: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const limitMutation = useMutation({
    mutationFn: () => api.put(`/credit/${selectedCustId}/limit`, {
      creditLimit: Number(limitForm.creditLimit),
      notes:       limitForm.notes || undefined,
    }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-accounts'] });
      qc.invalidateQueries({ queryKey: ['credit-detail', selectedCustId] });
      toast.success('Credit limit updated');
      setShowLimit(false);
      setLimitForm({ creditLimit: '', notes: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const usagePercent = (acc: CreditAccount) =>
    acc.creditLimit > 0 ? Math.min((acc.balance / acc.creditLimit) * 100, 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Credit</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} account{total !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && selectedCustId && (
          <div className="flex gap-2">
            <button type="button"
              onClick={() => { setLimitForm({ creditLimit: String(detail?.creditLimit ?? ''), notes: detail?.notes ?? '' }); setShowLimit(true); }}
              className="btn-secondary text-sm">Set Limit</button>
            <button type="button"
              onClick={() => setShowPayment(true)}
              className="flex items-center gap-2 btn-primary text-sm">
              <Plus size={15} /> Record Payment
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input className="input pl-9 w-full" placeholder="Search by customer name…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Account list */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading && <div className="card p-8 text-center text-[#94A3B8]">Loading…</div>}
          {!isLoading && accounts.length === 0 && (
            <div className="card p-12 text-center">
              <CreditCard size={40} className="mx-auto text-[#94A3B8] opacity-40 mb-3" />
              <p className="text-[#94A3B8]">No credit accounts yet.</p>
            </div>
          )}

          {accounts.map((acc) => {
            const pct    = usagePercent(acc);
            const isHigh = pct >= 80;
            return (
              <div key={acc.id}
                onClick={() => setSelected(acc.customerId === selectedCustId ? null : acc.customerId)}
                className={`card p-4 cursor-pointer transition-all border ${
                  selectedCustId === acc.customerId ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-dark-border'
                }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-card flex-shrink-0">
                      <CreditCard size={16} className={isHigh ? 'text-red-400' : 'text-primary'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{acc.customer.name}</p>
                      <p className="text-xs text-[#94A3B8]">{acc.customer.phone ?? acc.customer.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${isHigh ? 'text-red-400' : 'text-white'}`}>
                      ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      of ${acc.creditLimit.toLocaleString()} limit
                    </p>
                  </div>
                </div>
                {acc.creditLimit > 0 && (
                  <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isHigh ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}

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

        {/* Detail panel */}
        <div className="space-y-4">
          {!detail ? (
            <div className="card p-8 text-center text-[#94A3B8] text-sm">
              <CreditCard size={32} className="mx-auto mb-3 opacity-40" />
              Select an account to view details
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="card p-5 space-y-3">
                <p className="text-white font-bold">{detail.customer.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Balance',    value: `$${detail.balance.toFixed(2)}`,   icon: AlertCircle, cls: detail.balance > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Credit Limit', value: `$${detail.creditLimit.toFixed(2)}`, icon: CreditCard, cls: 'text-primary' },
                    { label: 'Total Debt', value: `$${detail.totalDebt.toFixed(2)}`,  icon: TrendingUp,  cls: 'text-orange-400' },
                    { label: 'Total Paid', value: `$${detail.totalPaid.toFixed(2)}`,  icon: CheckCircle, cls: 'text-green-400' },
                  ].map(({ label, value, icon: Icon, cls }) => (
                    <div key={label} className="bg-dark-bg rounded-xl p-3">
                      <Icon size={14} className={cls} />
                      <p className="text-white font-bold mt-1">{value}</p>
                      <p className="text-xs text-[#64748B]">{label}</p>
                    </div>
                  ))}
                </div>
                {detail.notes && <p className="text-xs text-[#64748B] italic">{detail.notes}</p>}
              </div>

              {/* Outstanding orders */}
              {detail.outstandingOrders && detail.outstandingOrders.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
                    <Clock size={14} className="text-yellow-400" />
                    <p className="text-sm font-semibold text-white">Outstanding Orders</p>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {detail.outstandingOrders.map((o) => (
                      <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">Order #{o.id}</p>
                          <p className="text-xs text-[#64748B]">{new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">${o.remainingAmount.toFixed(2)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${PAY_STATUS_CLS[o.paymentStatus] ?? ''}`}>
                            {o.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent payments */}
              {detail.payments && detail.payments.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
                    <DollarSign size={14} className="text-green-400" />
                    <p className="text-sm font-semibold text-white">Recent Payments</p>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white font-medium">${p.amount.toFixed(2)}</p>
                          <p className="text-xs text-[#64748B]">
                            {METHOD_LABELS[p.method] ?? p.method}
                            {p.order ? ` · Order #${p.order.id}` : ''}
                          </p>
                        </div>
                        <p className="text-xs text-[#64748B]">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayment && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
              <button type="button" onClick={() => setShowPayment(false)} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#94A3B8]">{detail.customer.name} — Balance: <span className="text-red-400 font-bold">${detail.balance.toFixed(2)}</span></p>

            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Amount ($) *</label>
              <input className="input w-full" type="number" step="0.01" min="0.01"
                value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Method</label>
              <select className="input w-full" value={payForm.method}
                onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
                {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Order ID (optional)</label>
                <input className="input w-full" type="number" placeholder="link to order"
                  value={payForm.orderId} onChange={(e) => setPayForm((p) => ({ ...p, orderId: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Reference</label>
                <input className="input w-full" placeholder="cheque no…"
                  value={payForm.reference} onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))} />
              </div>
            </div>
            <textarea className="input w-full resize-none" rows={2} placeholder="Notes (optional)"
              value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} />

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={!payForm.amount || paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {paymentMutation.isPending ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Limit Modal */}
      {showLimit && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Set Credit Limit</h2>
              <button type="button" onClick={() => setShowLimit(false)} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#94A3B8]">{detail.customer.name}</p>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Credit Limit ($) *</label>
              <input className="input w-full" type="number" step="0.01" min="0"
                value={limitForm.creditLimit}
                onChange={(e) => setLimitForm((p) => ({ ...p, creditLimit: e.target.value }))} />
            </div>
            <textarea className="input w-full resize-none" rows={2} placeholder="Notes (optional)"
              value={limitForm.notes}
              onChange={(e) => setLimitForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowLimit(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={limitForm.creditLimit === '' || limitMutation.isPending}
                onClick={() => limitMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {limitMutation.isPending ? 'Saving…' : 'Update Limit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
