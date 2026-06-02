'use client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { fetcher, api } from '@/lib/api';
import Header from '@/components/layout/Header';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, X } from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface Income  { id: number; amount: number; source: string; notes?: string; createdAt: string }
interface Expense { id: number; amount: number; category: string; notes?: string; createdAt: string }
interface FinanceSummary {
  totalIncome:   number;
  totalExpenses: number;
  netProfit:     number;
  incomes:       Income[];
  expenses:      Expense[];
}

const INCOME_SOURCES  = ['SALES', 'RETURNS', 'OTHER'] as const;
const EXPENSE_CATS    = ['SUPPLIES', 'RENT', 'UTILITIES', 'SALARIES', 'MARKETING', 'MAINTENANCE', 'OTHER'] as const;

// ── Add Income Modal ──────────────────────────────────────────────────────────
function AddIncomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ amount: number; source: string; notes: string }>();

  const mut = useMutation({
    mutationFn: (d: { amount: number; source: string; notes: string }) =>
      api.post('/finance/incomes', { amount: Number(d.amount), source: d.source, notes: d.notes || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Income added'); reset(); onClose(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-dark-surface border border-dark-border shadow-modal">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">Add Income</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Amount ($) *</label>
            <input {...register('amount', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="0.00" className="input" />
            {errors.amount && <p className="mt-1 text-xs text-danger">Valid amount required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Source *</label>
            <select {...register('source', { required: true })} className="input">
              <option value="">Select source…</option>
              {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.source && <p className="mt-1 text-xs text-danger">Source required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Optional notes…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Saving…' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Expense Modal ─────────────────────────────────────────────────────────
function AddExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ amount: number; category: string; notes: string }>();

  const mut = useMutation({
    mutationFn: (d: { amount: number; category: string; notes: string }) =>
      api.post('/finance/expenses', { amount: Number(d.amount), category: d.category, notes: d.notes || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Expense added'); reset(); onClose(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-dark-surface border border-dark-border shadow-modal">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">Add Expense</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Amount ($) *</label>
            <input {...register('amount', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="0.00" className="input" />
            {errors.amount && <p className="mt-1 text-xs text-danger">Valid amount required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Category *</label>
            <select {...register('category', { required: true })} className="input">
              <option value="">Select category…</option>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-danger">Category required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Optional notes…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all">
              {mut.isPending ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const qc = useQueryClient();
  const [showIncome,  setShowIncome]  = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const { data, isLoading } = useQuery<FinanceSummary>({
    queryKey: ['finance'],
    queryFn:  () => fetcher('/finance/summary'),
  });

  const deleteIncome = useMutation({
    mutationFn: (id: number) => api.delete(`/finance/incomes/${id}`),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Income deleted'); },
    onError:    (e: Error) => toast.error(e.message),
  });
  const deleteExpense = useMutation({
    mutationFn: (id: number) => api.delete(`/finance/expenses/${id}`),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Expense deleted'); },
    onError:    (e: Error) => toast.error(e.message),
  });

  const profit = data?.netProfit ?? 0;

  const summaryCards = [
    { label: 'Total Income',   value: data?.totalIncome,   icon: TrendingUp,   iconBg: 'gradient-teal',    valueColor: 'text-secondary' },
    { label: 'Total Expenses', value: data?.totalExpenses, icon: TrendingDown, iconBg: 'bg-danger/20',     valueColor: 'text-danger'    },
    { label: 'Net Profit',     value: profit,              icon: DollarSign,   iconBg: profit >= 0 ? 'gradient-brand' : 'bg-danger/20', valueColor: profit >= 0 ? 'text-primary' : 'text-danger' },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Finance" />
      <div className="p-6 space-y-6">

        {/* Export */}
        <div className="flex justify-end">
          <ExportButton endpoint="/export/finance" filename="finance" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon, iconBg, valueColor }) => (
            <div key={label} className="card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className={clsx('text-3xl font-bold', valueColor)}>
                {isLoading ? <span className="text-[#94A3B8]">—</span> : `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* Incomes */}
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-secondary" />
                <h3 className="font-semibold text-white">Incomes</h3>
                <span className="text-xs text-[#94A3B8]">({(data?.incomes ?? []).length})</span>
              </div>
              <button type="button" onClick={() => setShowIncome(true)}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/25 transition-colors">
                <Plus size={13} /> Add
              </button>
            </div>
            <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
              {(data?.incomes ?? []).length === 0 ? (
                <div className="py-10 text-center text-sm text-[#94A3B8]">No income records</div>
              ) : (data?.incomes ?? []).map((i) => (
                <div key={i.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-white">{i.source}</p>
                    {i.notes && <p className="text-xs text-[#64748B]">{i.notes}</p>}
                    <p className="text-xs text-[#94A3B8]">{new Date(i.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-secondary">+${i.amount.toFixed(2)}</span>
                    <button type="button" onClick={() => deleteIncome.mutate(i.id)}
                      disabled={deleteIncome.isPending}
                      aria-label="Delete income"
                      className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-danger/20 hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-danger" />
                <h3 className="font-semibold text-white">Expenses</h3>
                <span className="text-xs text-[#94A3B8]">({(data?.expenses ?? []).length})</span>
              </div>
              <button type="button" onClick={() => setShowExpense(true)}
                className="flex items-center gap-1.5 rounded-xl bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/25 transition-colors">
                <Plus size={13} /> Add
              </button>
            </div>
            <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
              {(data?.expenses ?? []).length === 0 ? (
                <div className="py-10 text-center text-sm text-[#94A3B8]">No expense records</div>
              ) : (data?.expenses ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-white">{e.category}</p>
                    {e.notes && <p className="text-xs text-[#64748B]">{e.notes}</p>}
                    <p className="text-xs text-[#94A3B8]">{new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-danger">-${e.amount.toFixed(2)}</span>
                    <button type="button" onClick={() => deleteExpense.mutate(e.id)}
                      disabled={deleteExpense.isPending}
                      aria-label="Delete expense"
                      className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-danger/20 hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <AddIncomeModal  open={showIncome}  onClose={() => setShowIncome(false)}  />
      <AddExpenseModal open={showExpense} onClose={() => setShowExpense(false)} />
    </div>
  );
}
