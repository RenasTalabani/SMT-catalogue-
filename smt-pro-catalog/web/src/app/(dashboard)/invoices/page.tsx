'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye, Search, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Invoice {
  id:            number;
  invoiceNumber: string;
  status:        string;
  total:         number;
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
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search],
    queryFn:  () =>
      api.get(`/invoices?page=${page}&limit=20${search ? `&search=${search}` : ''}`)
         .then((r) => r.data.data),
  });

  const invoices: Invoice[] = data?.invoices ?? [];
  const total: number       = data?.total    ?? 0;

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('daraliraq_token') ?? '' : '');

  const downloadPDF = (id: number, _number: string) => {
    toast.success('Downloading…');
    window.open(`/api/invoices/${id}/pdf?token=${getToken()}`, '_blank');
  };

  const previewPDF = (id: number) => {
    window.open(`/api/invoices/${id}/preview?token=${getToken()}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          className="input pl-9 w-full max-w-sm"
          placeholder="Search by invoice number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#94A3B8]">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-[#94A3B8] mb-3" />
            <p className="text-[#94A3B8]">No invoices yet. Generate one from the Orders page.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Invoice</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Total</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Payment</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Created By</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Date</th>
                <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-dark-border/50 hover:bg-dark-card/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-primary font-medium">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-white">{inv.customerName ?? 'Walk-in'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {STATUS_ICONS[inv.status]}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{inv.paymentMethod}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{inv.createdBy.name}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => previewPDF(inv.id)}
                        className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-primary transition-colors"
                        title="Preview PDF"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPDF(inv.id, inv.invoiceNumber)}
                        className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-green-400 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
              className="btn-secondary text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
