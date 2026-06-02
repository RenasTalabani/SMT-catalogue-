'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Shield, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface AuditLog {
  id:        number;
  action:    string;
  entity:    string;
  entityId:  number | null;
  metadata:  unknown;
  ipAddress: string | null;
  createdAt: string;
  user:      { id: number; name: string; role: string };
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:    'bg-blue-500/20 text-blue-400',
  REGISTER: 'bg-purple-500/20 text-purple-400',
  CREATE:   'bg-green-500/20 text-green-400',
  UPDATE:   'bg-yellow-500/20 text-yellow-400',
  DELETE:   'bg-red-500/20 text-red-400',
};

const ACTIONS  = ['', 'LOGIN', 'REGISTER', 'CREATE', 'UPDATE', 'DELETE'];
const ENTITIES = ['', 'User', 'Product', 'Category', 'Order', 'Invoice', 'Customer',
                  'Supplier', 'Expense', 'Income', 'StockMovement'];

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [page,   setPage]   = useState(1);

  const buildQuery = () => {
    const p = new URLSearchParams();
    p.set('page',  String(page));
    p.set('limit', '50');
    if (search) p.set('search', search);
    if (action) p.set('action', action);
    if (entity) p.set('entity', entity);
    if (from)   p.set('from', from);
    if (to)     p.set('to', to);
    return p.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search, action, entity, from, to],
    queryFn:  () => api.get(`/reports/audit?${buildQuery()}`).then((r) => r.data.data),
  });

  const logs: AuditLog[] = data?.logs  ?? [];
  const total: number    = data?.total ?? 0;

  const resetFilters = () => { setSearch(''); setAction(''); setEntity(''); setFrom(''); setTo(''); setPage(1); };

  const handleExport = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('daraliraq_token') ?? '' : '';
    const p = new URLSearchParams();
    if (action) p.set('action', action);
    if (entity) p.set('entity', entity);
    if (from)   p.set('from', from);
    if (to)     p.set('to', to);
    p.set('token', token);
    window.open(`/api/reports/audit/export?${p.toString()}`, '_blank');
    toast.success('Exporting CSV…');
  };

  const hasFilters = search || action || entity || from || to;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-primary" /> Audit Logs
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} event{total !== 1 ? 's' : ''} recorded</p>
        </div>
        <button type="button" onClick={handleExport}
          className="flex items-center gap-2 btn-secondary text-sm">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#94A3B8]">
          <Filter size={14} /> Filters
          {hasFilters && (
            <button type="button" onClick={resetFilters}
              className="ml-auto text-xs text-primary hover:underline">Clear all</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by user */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input className="input pl-8 w-full text-sm" placeholder="Search user…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {/* Action filter */}
          <select className="input w-full text-sm" value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {ACTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* Entity filter */}
          <select className="input w-full text-sm" value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
            <option value="">All entities</option>
            {ENTITIES.filter(Boolean).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {/* Date range */}
          <div className="flex gap-2">
            <input type="date" className="input w-full text-sm" value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input type="date" className="input w-full text-sm" value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading audit logs…</div>}

      {!isLoading && logs.length === 0 && (
        <div className="card p-12 text-center">
          <Shield size={40} className="mx-auto text-[#94A3B8] mb-3 opacity-40" />
          <p className="text-[#94A3B8]">No audit logs found for the selected filters.</p>
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  {['Time', 'User', 'Action', 'Entity', 'ID', 'IP'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[#94A3B8] font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-dark-border/40 hover:bg-dark-card/30 transition-colors">
                    <td className="px-4 py-2.5 text-[#94A3B8] text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="text-white font-medium text-xs">{log.user.name}</p>
                        <p className="text-[#64748B] text-xs capitalize">{log.user.role.replace('_', ' ')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#CBD5E1] text-xs">{log.entity}</td>
                    <td className="px-4 py-2.5 text-[#64748B] text-xs">{log.entityId ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[#64748B] text-xs font-mono">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">
            {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}
              className="btn-secondary text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
