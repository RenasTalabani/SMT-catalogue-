'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, Trophy, Plus, X, TrendingUp, CheckCircle, XCircle,
  Award, BarChart2, Package, ClipboardList,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Rating {
  id:              number;
  qualityScore:    number;
  deliveryScore:   number;
  pricingScore:    number;
  overallScore:    number;
  deliveredOnTime: boolean;
  fillRate:        number;
  notes:           string | null;
  createdAt:       string;
  supplier:        { id: number; name: string };
  purchaseOrder:   { id: number; status: string; total: number; createdAt: string };
  ratedByUser:     { id: number; name: string };
}

interface LeaderboardEntry {
  supplier:        { id: number; name: string } | undefined;
  totalRatings:    number;
  avgOverallScore: number;
  avgFillRate:     number;
}

interface SupplierStats {
  supplier:         { id: number; name: string };
  totalRatings:     number;
  onTimeDeliveryPct: number;
  avgQualityScore:  number;
  avgDeliveryScore: number;
  avgPricingScore:  number;
  avgOverallScore:  number;
  avgFillRate:      number;
}

const emptyRatingForm = {
  supplierId:      '',
  purchaseOrderId: '',
  qualityScore:    '5',
  deliveryScore:   '5',
  pricingScore:    '5',
  deliveredOnTime: true,
  fillRate:        '100',
  notes:           '',
};

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white font-medium w-6 text-right">{value}</span>
    </div>
  );
}

function StarScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12}
          className={i <= Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-[#475569]'} />
      ))}
      <span className="ml-1 text-xs text-[#94A3B8]">{score.toFixed(1)}</span>
    </div>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-[#94A3B8]">{label}</label>
        <span className="text-sm font-bold text-white">{value}/5</span>
      </div>
      <input type="range" min="1" max="5" step="1" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full accent-primary" />
      <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

export default function SupplierRatingsPage() {
  const qc = useQueryClient();
  const [tab, setTab]             = useState<'leaderboard' | 'ratings'>('leaderboard');
  const [page, setPage]           = useState(1);
  const [filterSupplier, setFilterS] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statsId, setStatsId]     = useState<number | null>(null);
  const [form, setForm]           = useState(emptyRatingForm);

  const { data: lbData, isLoading: lbLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['supplier-leaderboard'],
    queryFn:  () => api.get('/supplier-ratings/leaderboard?limit=20').then((r) => r.data.data),
    enabled:  tab === 'leaderboard',
  });

  const { data: ratingsData, isLoading: ratLoading } = useQuery({
    queryKey: ['supplier-ratings', page, filterSupplier],
    queryFn:  () =>
      api.get(`/supplier-ratings?page=${page}&limit=20${filterSupplier ? `&supplierId=${filterSupplier}` : ''}`)
         .then((r) => r.data.data),
    enabled: tab === 'ratings',
  });

  const { data: statsData } = useQuery<SupplierStats>({
    queryKey: ['supplier-stats', statsId],
    queryFn:  () => api.get(`/supplier-ratings/supplier/${statsId}/stats`).then((r) => r.data.data),
    enabled:  !!statsId,
  });

  const ratings: Rating[] = ratingsData?.ratings ?? [];
  const totalRatings       = ratingsData?.total    ?? 0;

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/supplier-ratings', {
        supplierId:      Number(form.supplierId),
        purchaseOrderId: Number(form.purchaseOrderId),
        qualityScore:    Number(form.qualityScore),
        deliveryScore:   Number(form.deliveryScore),
        pricingScore:    Number(form.pricingScore),
        deliveredOnTime: form.deliveredOnTime,
        fillRate:        Number(form.fillRate),
        notes:           form.notes || undefined,
      }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-ratings'] });
      qc.invalidateQueries({ queryKey: ['supplier-leaderboard'] });
      if (statsId) qc.invalidateQueries({ queryKey: ['supplier-stats', statsId] });
      toast.success('Rating submitted');
      setShowModal(false);
      setForm(emptyRatingForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/supplier-ratings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-ratings'] });
      qc.invalidateQueries({ queryKey: ['supplier-leaderboard'] });
      toast.success('Rating deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (k: keyof typeof emptyRatingForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Supplier Ratings</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Performance tracking per purchase order</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)}
          className="flex items-center gap-2 btn-primary text-sm">
          <Plus size={15} /> Rate a PO
        </button>
      </div>

      {/* Stats panel for selected supplier */}
      {statsData && (
        <div className="card p-5 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold text-lg">{statsData.supplier.name}</p>
              <p className="text-sm text-[#94A3B8]">{statsData.totalRatings} ratings</p>
            </div>
            <button type="button" onClick={() => setStatsId(null)}
              className="text-[#94A3B8] hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#94A3B8] mb-1">Overall</p>
              <p className="text-2xl font-bold text-white">{statsData.avgOverallScore.toFixed(1)}</p>
              <StarScore score={statsData.avgOverallScore} />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] mb-2">On-time Delivery</p>
              <p className="text-xl font-bold text-white">{statsData.onTimeDeliveryPct}%</p>
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] mb-2">Fill Rate</p>
              <p className="text-xl font-bold text-white">{statsData.avgFillRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]"><span>Quality</span></div>
              <ScoreBar value={statsData.avgQualityScore} />
              <div className="flex items-center justify-between text-xs text-[#94A3B8]"><span>Delivery</span></div>
              <ScoreBar value={statsData.avgDeliveryScore} />
              <div className="flex items-center justify-between text-xs text-[#94A3B8]"><span>Pricing</span></div>
              <ScoreBar value={statsData.avgPricingScore} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        {(['leaderboard', 'ratings'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-primary border-primary'
                : 'text-[#94A3B8] border-transparent hover:text-white'
            }`}>
            {t === 'leaderboard' ? '🏆 Leaderboard' : '📋 All Ratings'}
          </button>
        ))}
      </div>

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="space-y-3">
          {lbLoading && <div className="card p-8 text-center text-[#94A3B8]">Loading leaderboard…</div>}
          {!lbLoading && (lbData ?? []).length === 0 && (
            <div className="card p-12 text-center">
              <Trophy size={40} className="mx-auto text-[#94A3B8] opacity-40 mb-3" />
              <p className="text-[#94A3B8]">No ratings submitted yet. Rate a purchase order to start.</p>
            </div>
          )}
          {(lbData ?? []).map((entry, idx) => (
            <div key={entry.supplier?.id ?? idx}
              onClick={() => { if (entry.supplier) { setStatsId(entry.supplier.id); setTab('leaderboard'); } }}
              className="card p-4 cursor-pointer hover:border-dark-border border border-transparent transition-all flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm flex-shrink-0 ${
                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-dark-card text-[#94A3B8]'
              }`}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{entry.supplier?.name ?? 'Unknown'}</p>
                <p className="text-xs text-[#94A3B8]">{entry.totalRatings} ratings · Fill rate {entry.avgFillRate.toFixed(0)}%</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StarScore score={entry.avgOverallScore} />
                <span className="text-xs text-[#64748B]">tap for details</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ratings Tab */}
      {tab === 'ratings' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input className="input flex-1" type="number" placeholder="Filter by Supplier ID"
              value={filterSupplier}
              onChange={(e) => { setFilterS(e.target.value); setPage(1); }} />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    {['Supplier', 'PO', 'Quality', 'Delivery', 'Pricing', 'Overall', 'On Time', 'Fill %', 'Rated By'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                    ))}
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {ratLoading && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>
                  )}
                  {!ratLoading && ratings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center">
                        <ClipboardList size={36} className="mx-auto text-[#94A3B8] opacity-40 mb-2" />
                        <p className="text-[#94A3B8]">No ratings found</p>
                      </td>
                    </tr>
                  )}
                  {ratings.map((r) => (
                    <tr key={r.id} className="hover:bg-dark-card/30 transition-colors">
                      <td className="px-4 py-3">
                        <button type="button"
                          onClick={() => { setStatsId(r.supplier.id); setTab('leaderboard'); }}
                          className="text-white font-medium hover:text-primary transition-colors truncate max-w-[100px] block">
                          {r.supplier.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] text-xs">
                        <div>#{r.purchaseOrder.id}</div>
                        <div className="text-[#64748B]">{new Date(r.purchaseOrder.createdAt).toLocaleDateString()}</div>
                      </td>
                      {[r.qualityScore, r.deliveryScore, r.pricingScore].map((score, i) => (
                        <td key={i} className="px-4 py-3">
                          <StarScore score={score} />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <span className="text-white font-bold">{r.overallScore.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.deliveredOnTime
                          ? <CheckCircle size={16} className="text-green-400" />
                          : <XCircle    size={16} className="text-red-400" />}
                      </td>
                      <td className="px-4 py-3 text-white">{r.fillRate.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-[#94A3B8] text-xs">{r.ratedByUser.name}</td>
                      <td className="px-4 py-3">
                        <button type="button"
                          onClick={() => { if (confirm('Delete this rating?')) deleteMutation.mutate(r.id); }}
                          className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalRatings > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
                <p className="text-sm text-[#94A3B8]">{(page - 1) * 20 + 1}–{Math.min(page * 20, totalRatings)} of {totalRatings}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
                  <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= totalRatings}
                    className="btn-secondary text-sm disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rate PO Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md space-y-4 p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-primary" /> Rate Purchase Order
              </h2>
              <button type="button" onClick={() => { setShowModal(false); setForm(emptyRatingForm); }}
                className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Supplier ID *</label>
                  <input className="input w-full" type="number" placeholder="e.g. 1" value={form.supplierId}
                    onChange={(e) => f('supplierId')(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">Purchase Order ID *</label>
                  <input className="input w-full" type="number" placeholder="e.g. 42" value={form.purchaseOrderId}
                    onChange={(e) => f('purchaseOrderId')(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 border border-dark-border rounded-xl p-4">
                <p className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wide">Scores (1–5)</p>
                <ScoreInput label="Product Quality"   value={form.qualityScore}  onChange={f('qualityScore')} />
                <ScoreInput label="Delivery Speed"    value={form.deliveryScore} onChange={f('deliveryScore')} />
                <ScoreInput label="Pricing / Value"   value={form.pricingScore}  onChange={f('pricingScore')} />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Fill Rate % (received / ordered)</label>
                <input className="input w-full" type="number" min="0" max="100" step="0.1"
                  value={form.fillRate} onChange={(e) => f('fillRate')(e.target.value)} />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${form.deliveredOnTime ? 'bg-green-500' : 'bg-dark-border'}`}
                  onClick={() => setForm((p) => ({ ...p, deliveredOnTime: !p.deliveredOnTime }))}>
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.deliveredOnTime ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-[#CBD5E1]">Delivered on time</span>
                {form.deliveredOnTime
                  ? <CheckCircle size={14} className="text-green-400" />
                  : <XCircle    size={14} className="text-red-400" />}
              </label>

              <textarea className="input w-full resize-none" rows={2} placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button type="button"
                onClick={() => { setShowModal(false); setForm(emptyRatingForm); }}
                className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={!form.supplierId || !form.purchaseOrderId || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {submitMutation.isPending ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
