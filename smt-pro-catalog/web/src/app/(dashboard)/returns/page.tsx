'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, ChevronRight, CheckCircle, XCircle,
  Clock, Package, DollarSign, X, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface ReturnItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  condition: 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
  product: { id: number; name: string; sku: string | null; unit: string };
  orderItem: { id: number; quantity: number; price: number };
}

interface ReturnRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  reason: string;
  notes: string | null;
  refundAmount: number;
  refundMethod: string;
  resolvedAt: string | null;
  createdAt: string;
  requester:  { id: number; name: string; email?: string };
  reviewer?:  { id: number; name: string } | null;
  order:      { id: number; finalAmount: number; status?: string; paymentMethod?: string };
  _count?:    { items: number };
  items?:     ReturnItem[];
}

interface ReturnStats {
  byStatus:       Array<{ status: string; count: number; refunded: number }>;
  totalRefunded:  number;
  recentRequests: ReturnRequest[];
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  APPROVED:  { label: 'Approved',  cls: 'bg-blue-500/20 text-blue-400',    icon: CheckCircle },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-500/20 text-red-400',      icon: XCircle },
  PROCESSED: { label: 'Processed', cls: 'bg-green-500/20 text-green-400',  icon: Package },
};

const CONDITION_CONFIG: Record<string, string> = {
  GOOD:      'bg-green-500/20 text-green-400',
  DAMAGED:   'bg-red-500/20 text-red-400',
  DEFECTIVE: 'bg-yellow-500/20 text-yellow-400',
};

export default function ReturnsPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const canWrite = ['super_admin', 'admin'].includes(user?.role ?? '');

  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [selectedId, setSelected] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status:       'APPROVED' as 'APPROVED' | 'REJECTED',
    refundAmount: '',
    notes:        '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page, statusFilter],
    queryFn:  () =>
      api.get(`/returns?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`)
         .then((r) => r.data.data),
  });

  const { data: stats } = useQuery<ReturnStats>({
    queryKey: ['return-stats'],
    queryFn:  () => api.get('/returns/stats').then((r) => r.data.data),
  });

  const { data: detail } = useQuery<ReturnRequest>({
    queryKey: ['return-detail', selectedId],
    queryFn:  () => api.get(`/returns/${selectedId}`).then((r) => r.data.data),
    enabled:  !!selectedId,
  });

  const returns: ReturnRequest[] = data?.returns ?? [];
  const total: number            = data?.total    ?? 0;

  const reviewMutation = useMutation({
    mutationFn: () => api.patch(`/returns/${selectedId}/review`, {
      status:       reviewForm.status,
      refundAmount: reviewForm.refundAmount ? Number(reviewForm.refundAmount) : undefined,
      notes:        reviewForm.notes || undefined,
    }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['return-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['return-stats'] });
      toast.success(`Return ${reviewForm.status.toLowerCase()}`);
      setShowReview(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const processMutation = useMutation({
    mutationFn: (id: number) => api.post(`/returns/${id}/process`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['return-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['return-stats'] });
      toast.success('Return processed — stock restored');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Returns & Refunds</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} request{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-4">
            <DollarSign size={18} className="text-green-400 mb-1" />
            <p className="text-xl font-bold text-white">${stats.totalRefunded.toLocaleString()}</p>
            <p className="text-xs text-[#94A3B8]">Total Refunded</p>
          </div>
          {stats.byStatus.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <div key={status}
                onClick={() => { setStatus(statusFilter === status ? '' : status); setPage(1); }}
                className="card p-4 cursor-pointer hover:border-dark-border border border-transparent transition-all">
                <Icon size={16} className={cfg.cls.split(' ')[1]} />
                <p className="text-xl font-bold text-white mt-1">{count}</p>
                <p className="text-xs text-[#94A3B8]">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[statusFilter]?.cls ?? ''}`}>
                {STATUS_CONFIG[statusFilter]?.label}
              </span>
              <button type="button" onClick={() => setStatus('')} className="text-xs text-[#94A3B8] hover:text-white">× clear</button>
            </div>
          )}

          {isLoading && <div className="card p-8 text-center text-[#94A3B8]">Loading…</div>}
          {!isLoading && returns.length === 0 && (
            <div className="card p-12 text-center">
              <RotateCcw size={40} className="mx-auto text-[#94A3B8] opacity-40 mb-3" />
              <p className="text-[#94A3B8]">No return requests.</p>
            </div>
          )}

          {returns.map((ret) => {
            const cfg  = STATUS_CONFIG[ret.status] ?? STATUS_CONFIG['PENDING'];
            const Icon = cfg.icon;
            return (
              <div key={ret.id}
                onClick={() => setSelected(ret.id === selectedId ? null : ret.id)}
                className={`card p-4 cursor-pointer transition-all border ${
                  selectedId === ret.id ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-dark-border'
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-card flex-shrink-0">
                      <RotateCcw size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold">Return #{ret.id} — Order #{ret.order.id}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{ret.requester.name} · {ret.reason.slice(0, 40)}{ret.reason.length > 40 ? '…' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-white font-bold">${ret.refundAmount.toFixed(2)}</p>
                      <p className="text-xs text-[#64748B]">{new Date(ret.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>
                      <Icon size={10} />{cfg.label}
                    </span>
                    <ChevronRight size={14} className={`text-[#94A3B8] transition-transform ${selectedId === ret.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
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
              <RotateCcw size={32} className="mx-auto mb-3 opacity-40" />
              Select a return to view details
            </div>
          ) : (
            <>
              <div className="card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold">Return #{detail.id}</p>
                    <p className="text-sm text-[#94A3B8]">Order #{detail.order.id}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[detail.status]?.cls ?? ''}`}>
                    {STATUS_CONFIG[detail.status]?.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Requested by</span>
                    <span className="text-white">{detail.requester.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Refund amount</span>
                    <span className="text-white font-bold">${detail.refundAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Method</span>
                    <span className="text-white">{detail.refundMethod}</span>
                  </div>
                  {detail.reviewer && (
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Reviewed by</span>
                      <span className="text-white">{detail.reviewer.name}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#94A3B8] border-t border-dark-border pt-2">{detail.reason}</p>
                {detail.notes && <p className="text-xs text-[#64748B] italic">{detail.notes}</p>}

                {canWrite && (
                  <div className="flex gap-2 pt-1">
                    {detail.status === 'PENDING' && (
                      <button type="button"
                        onClick={() => { setReviewForm({ status: 'APPROVED', refundAmount: String(detail.refundAmount), notes: '' }); setShowReview(true); }}
                        className="btn-primary text-xs flex-1">Review</button>
                    )}
                    {detail.status === 'APPROVED' && (
                      <button type="button"
                        onClick={() => { if (confirm('Process this return and restore stock?')) processMutation.mutate(detail.id); }}
                        disabled={processMutation.isPending}
                        className="btn-primary text-xs flex-1 disabled:opacity-40">
                        {processMutation.isPending ? 'Processing…' : 'Process Return'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-dark-border">
                  <p className="text-sm font-semibold text-white">Items ({detail.items?.length ?? 0})</p>
                </div>
                <div className="divide-y divide-dark-border">
                  {detail.items?.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-[#64748B]">×{item.quantity} @ ${item.unitPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${CONDITION_CONFIG[item.condition] ?? ''}`}>
                          {item.condition}
                        </span>
                        <p className="text-sm font-bold text-white">${(item.quantity * item.unitPrice).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReview && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={18} className="text-primary" /> Review Return #{detail.id}
              </h2>
              <button type="button" onClick={() => setShowReview(false)} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex gap-2">
              {(['APPROVED', 'REJECTED'] as const).map((s) => (
                <button key={s} type="button"
                  onClick={() => setReviewForm((f) => ({ ...f, status: s }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    reviewForm.status === s
                      ? s === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'text-[#94A3B8] border-dark-border hover:text-white'
                  }`}>
                  {s === 'APPROVED' ? '✓ Approve' : '✗ Reject'}
                </button>
              ))}
            </div>

            {reviewForm.status === 'APPROVED' && (
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Refund Amount ($)</label>
                <input className="input w-full" type="number" step="0.01"
                  value={reviewForm.refundAmount}
                  onChange={(e) => setReviewForm((f) => ({ ...f, refundAmount: e.target.value }))} />
              </div>
            )}

            <textarea className="input w-full resize-none" rows={2} placeholder="Notes (optional)"
              value={reviewForm.notes}
              onChange={(e) => setReviewForm((f) => ({ ...f, notes: e.target.value }))} />

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowReview(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
                className={`text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-40 ${
                  reviewForm.status === 'APPROVED' ? 'btn-primary' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}>
                {reviewMutation.isPending ? 'Saving…' : `Confirm ${reviewForm.status === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
