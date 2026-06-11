'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Eye, Search, CheckCircle, Clock, XCircle, Printer, DollarSign, X, Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';

interface Invoice {
  id:            number;
  invoiceNumber: string;
  status:        string;
  total:         number;
  paidAmount:    number;
  isLoan:        boolean;
  customerName:  string | null;
  paymentMethod: string;
  createdAt:     string;
  pdfUrl:        string | null;
  createdBy:     { name: string };
}

const STATUS_STYLES: Record<string, string> = {
  ISSUED:    'bg-blue-500/20 text-blue-400',
  PAID:      'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  DRAFT:     'bg-yellow-500/20 text-yellow-400',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  ISSUED:    <Clock size={12} />,
  PAID:      <CheckCircle size={12} />,
  CANCELLED: <XCircle size={12} />,
  DRAFT:     <Clock size={12} />,
};

export default function InvoicesPage() {
  const { user }                          = useAuthStore();
  const isAdmin                           = ['super_admin', 'admin'].includes(user?.role ?? '');
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [payModal, setPayModal]           = useState<Invoice | null>(null);
  const [payAmount, setPayAmount]         = useState('');
  const [payNotes, setPayNotes]           = useState('');
  const [payLoading, setPayLoading]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editModal, setEditModal]         = useState<Invoice | null>(null);
  const [editLoading, setEditLoading]     = useState(false);
  const [editForm, setEditForm]           = useState({ customerName: '', customerPhone: '', paymentMethod: 'CASH', paidAmount: '', isLoan: false, status: '', notes: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search],
    queryFn:  () =>
      api.get(`/invoices?page=${page}&limit=20${search ? `&search=${search}` : ''}`)
         .then((r) => r.data.data),
  });

  const invoices: Invoice[] = data?.invoices ?? [];
  const total: number       = data?.total    ?? 0;

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('daraliraq_token') ?? '' : '';

  const openPDF = (id: number, mode: 'preview' | 'pdf') => {
    if (mode === 'pdf') toast.success('Downloading…');
    window.open(`/api/invoices/${id}/${mode}?token=${getToken()}`, '_blank');
  };

  const openPayModal = (inv: Invoice) => {
    setPayModal(inv);
    setPayAmount('');
    setPayNotes('');
  };

  const submitPayment = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setPayLoading(true);
    try {
      await api.post(`/invoices/${payModal.id}/payment`, { amount: amt, notes: payNotes || undefined });
      toast.success('Payment recorded!');
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPayModal(null);
      setTimeout(() => {
        window.open(`/api/invoices/${payModal.id}/preview?token=${getToken()}`, '_blank');
      }, 300);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/invoices/${deleteConfirm.id}`);
      toast.success(`Invoice ${deleteConfirm.invoiceNumber} deleted`);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (inv: Invoice) => {
    setEditForm({
      customerName:  inv.customerName  ?? '',
      customerPhone: inv.customerPhone ?? '',
      paymentMethod: inv.paymentMethod,
      paidAmount:    String(inv.paidAmount ?? 0),
      isLoan:        inv.isLoan,
      status:        inv.status,
      notes:         '',
    });
    setEditModal(inv);
  };

  const submitEdit = async () => {
    if (!editModal) return;
    setEditLoading(true);
    try {
      await api.patch(`/invoices/${editModal.id}/edit`, {
        customerName:  editForm.customerName  || null,
        customerPhone: editForm.customerPhone || null,
        paymentMethod: editForm.paymentMethod,
        paidAmount:    parseFloat(editForm.paidAmount) || 0,
        isLoan:        editForm.isLoan,
        status:        editForm.status || undefined,
        notes:         editForm.notes  || null,
      });
      toast.success('Invoice updated');
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setEditModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update invoice');
    } finally {
      setEditLoading(false);
    }
  };

  const remaining = (inv: Invoice) => parseFloat((inv.total - (inv.paidAmount ?? 0)).toFixed(2));

  return (
    <div className="flex flex-col">
      <Header title="Invoices" />

      {/* ── Payment modal ──────────────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Record Payment</h3>
              <button type="button" onClick={() => setPayModal(null)}
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="text-sm text-[#94A3B8] space-y-1">
              <p>Invoice: <span className="text-primary font-mono font-bold">{payModal.invoiceNumber}</span></p>
              <p>Customer: <span className="text-white">{payModal.customerName ?? 'Walk-in'}</span></p>
              <p>Total: <span className="text-white font-bold">${payModal.total.toFixed(2)}</span>
                 <span className="ml-2">Paid: <span className="text-green-400 font-bold">${(payModal.paidAmount ?? 0).toFixed(2)}</span></span></p>
              <p className="text-red-400 font-bold text-base">Remaining: ${remaining(payModal).toFixed(2)}</p>
            </div>
            <input
              type="number" min="0.01" step="0.01"
              className="input w-full text-sm"
              placeholder={`Amount (max $${remaining(payModal).toFixed(2)})`}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <input
              className="input w-full text-sm"
              placeholder="Notes (optional)"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
            <button type="button" onClick={submitPayment} disabled={payLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50">
              {payLoading ? 'Saving…' : 'Record Payment & Update Invoice'}
            </button>
          </div>
        </div>
      )}
      {/* ── Edit invoice modal ────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Edit Invoice <span className="text-primary font-mono">{editModal.invoiceNumber}</span></h3>
              <button type="button" onClick={() => setEditModal(null)} title="Close"
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Customer Name</label>
                <input title="Customer name" placeholder="Customer name" className="input w-full text-sm" value={editForm.customerName}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Phone</label>
                <input title="Phone number" placeholder="Phone number" className="input w-full text-sm" value={editForm.customerPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Payment Method</label>
                <select title="Payment method" className="input w-full text-sm" value={editForm.paymentMethod}
                  onChange={(e) => setEditForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  {['CASH','CARD','TRANSFER','OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Status</label>
                <select title="Invoice status" className="input w-full text-sm" value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                  {['ISSUED','PAID','CANCELLED','DRAFT'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">
                Amount Paid <span className="text-[#64748B]">(total: ${editModal.total.toFixed(2)})</span>
              </label>
              <input type="number" min="0" step="0.01" title="Amount paid" placeholder="0.00" className="input w-full text-sm"
                value={editForm.paidAmount}
                onChange={(e) => setEditForm((f) => ({ ...f, paidAmount: e.target.value }))} />
              {editForm.paidAmount !== '' && (
                <p className="text-xs mt-1">
                  {parseFloat(editForm.paidAmount) >= editModal.total
                    ? <span className="text-green-400">Fully paid — status will be set to PAID</span>
                    : <span className="text-yellow-400">Remaining: ${Math.max(0, editModal.total - (parseFloat(editForm.paidAmount) || 0)).toFixed(2)} — status will be ISSUED</span>
                  }
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" checked={editForm.isLoan}
                onChange={(e) => setEditForm((f) => ({ ...f, isLoan: e.target.checked }))} />
              <span className="text-sm text-white">Loan / Installment</span>
            </label>

            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Notes (optional)</label>
              <textarea title="Notes" placeholder="Notes (optional)" className="input w-full text-sm resize-none" rows={2} value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditModal(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="button" onClick={submitEdit} disabled={editLoading} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ───────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Delete Invoice</h3>
              <button type="button" onClick={() => setDeleteConfirm(null)} title="Close"
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-[#94A3B8]">
              Permanently delete invoice <span className="text-primary font-mono font-bold">{deleteConfirm.invoiceNumber}</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 md:p-6 space-y-5">

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          className="input pl-9 w-full"
          placeholder="Search by invoice number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Loading / empty */}
      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading invoices…</div>}
      {!isLoading && invoices.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto text-[#94A3B8] mb-3" />
          <p className="text-[#94A3B8]">No invoices yet. Generate one from the Orders page.</p>
        </div>
      )}

      {/* ── Mobile: card list (hidden on md+) ─────────────────────────────── */}
      {!isLoading && invoices.length > 0 && (
        <div className="space-y-3 md:hidden">
          {invoices.map((inv) => (
            <div key={inv.id} className="card rounded-2xl p-4 space-y-3">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-primary font-bold text-sm">{inv.invoiceNumber}</p>
                  <p className="text-white font-semibold mt-0.5">{inv.customerName ?? 'Walk-in'}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {inv.paymentMethod} · {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">${inv.total.toFixed(2)}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_STYLES[inv.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {STATUS_ICONS[inv.status]}
                    {inv.status}
                  </span>
                  {inv.isLoan && remaining(inv) > 0 && (
                    <p className="text-[11px] text-red-400 font-bold mt-1">
                      Owes ${remaining(inv).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Loan record payment button */}
              {inv.isLoan && remaining(inv) > 0 && (
                <button type="button" onClick={() => openPayModal(inv)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 py-2 text-sm font-medium transition-colors">
                  <DollarSign size={14} /> Record Payment
                </button>
              )}

              {/* Action buttons — full width on mobile */}
              <div className="flex gap-2">
                <button type="button" onClick={() => openPDF(inv.id, 'preview')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 py-2 text-sm font-medium transition-colors">
                  <Eye size={15} /> Preview
                </button>
                <button type="button" onClick={() => openPDF(inv.id, 'pdf')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 py-2 text-sm font-medium transition-colors">
                  <Printer size={15} /> Print / Save
                </button>
                <button type="button" onClick={() => openPDF(inv.id, 'pdf')} title="Download PDF" aria-label="Download PDF"
                  className="flex items-center justify-center rounded-xl bg-dark-card text-[#94A3B8] hover:text-white px-3 py-2 transition-colors">
                  <Download size={15} />
                </button>
                {isAdmin && (
                  <button type="button" onClick={() => openEdit(inv)} title="Edit invoice" aria-label="Edit invoice"
                    className="flex items-center justify-center rounded-xl bg-dark-card text-[#94A3B8] hover:text-primary hover:bg-primary/10 px-3 py-2 transition-colors">
                    <Pencil size={15} />
                  </button>
                )}
                {isAdmin && (
                  <button type="button" onClick={() => setDeleteConfirm(inv)} title="Delete invoice" aria-label="Delete invoice"
                    className="flex items-center justify-center rounded-xl bg-dark-card text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 px-3 py-2 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop: table (hidden on mobile) ─────────────────────────────── */}
      {!isLoading && invoices.length > 0 && (
        <div className="card overflow-hidden hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Invoice', 'Customer', 'Status', 'Total', 'Payment', 'By', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[#94A3B8] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-dark-border/50 hover:bg-dark-card/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-primary font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-white">{inv.customerName ?? 'Walk-in'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_STYLES[inv.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {STATUS_ICONS[inv.status]}{inv.status}
                      </span>
                      {inv.isLoan && remaining(inv) > 0 && (
                        <span className="text-[10px] text-red-400 font-bold">
                          Owes ${remaining(inv).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{inv.paymentMethod}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{inv.createdBy.name}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {inv.isLoan && remaining(inv) > 0 && (
                        <button type="button" onClick={() => openPayModal(inv)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Record payment">
                          <DollarSign size={15} />
                        </button>
                      )}
                      <button type="button" onClick={() => openPDF(inv.id, 'preview')}
                        className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors" title="Preview">
                        <Eye size={15} />
                      </button>
                      <button type="button" onClick={() => openPDF(inv.id, 'pdf')}
                        className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-green-400 transition-colors" title="Download">
                        <Download size={15} />
                      </button>
                      {isAdmin && (
                        <button type="button" onClick={() => openEdit(inv)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-[#94A3B8] hover:text-primary transition-colors" title="Edit invoice">
                          <Pencil size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button type="button" onClick={() => setDeleteConfirm(inv)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 transition-colors" title="Delete invoice">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
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
    </div>
  );
}
