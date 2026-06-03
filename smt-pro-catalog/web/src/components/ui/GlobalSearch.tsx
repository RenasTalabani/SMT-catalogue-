'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Package, Users, ShoppingCart, FileText, Truck, X, Command } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchResults {
  products:  Array<{ id: number; name: string; sku: string | null; price: number; quantity: number; category: string }>;
  customers: Array<{ id: number; name: string; phone: string | null; email: string | null }>;
  orders:    Array<{ id: number; status: string; finalAmount: number; createdAt: string; customer: { name: string } | null }>;
  invoices:  Array<{ id: number; invoiceNumber: string; customerName: string | null; total: number; status: string }>;
  suppliers: Array<{ id: number; name: string; phone: string | null; email: string | null }>;
  total:     number;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-green-400', PENDING: 'text-yellow-400', CANCELLED: 'text-red-400',
  PAID: 'text-green-400', ISSUED: 'text-blue-400',
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery('');
  }, [open]);

  const { data, isFetching } = useQuery<SearchResults>({
    queryKey: ['global-search', query],
    queryFn:  () => api.get(`/search?q=${encodeURIComponent(query)}`).then((r) => r.data.data),
    enabled:  query.length >= 2,
    staleTime: 1000,
  });

  const navigate = useCallback((path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  }, [router]);

  const hasResults = data && data.total > 0;

  return (
    <>
      {/* Trigger button in header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-card text-[#94A3B8] hover:text-white hover:bg-dark-border transition-colors text-sm"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search…</span>
        <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#64748B] border border-dark-border rounded px-1">
          <Command size={9} />K
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>

            {/* Search input */}
            <div className="card rounded-2xl overflow-hidden shadow-2xl border border-dark-border">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border">
                <Search size={18} className="text-[#94A3B8] flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, orders, customers, invoices, suppliers…"
                  className="flex-1 bg-transparent text-white placeholder-[#64748B] outline-none text-sm"
                />
                {isFetching && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />}
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-[#94A3B8] hover:text-white flex-shrink-0">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">

                {query.length < 2 && (
                  <div className="py-10 text-center text-sm text-[#64748B]">
                    Type at least 2 characters to search…
                  </div>
                )}

                {query.length >= 2 && !isFetching && !hasResults && (
                  <div className="py-10 text-center text-sm text-[#64748B]">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}

                {hasResults && (
                  <div className="divide-y divide-dark-border">

                    {/* Products */}
                    {data.products.length > 0 && (
                      <Section icon={<Package size={13} />} label="Products" color="text-primary">
                        {data.products.map((p) => (
                          <ResultRow key={`p-${p.id}`} onClick={() => navigate('/products')}>
                            <span className="text-white font-medium">{p.name}</span>
                            <span className="text-[#64748B] text-xs ml-auto flex-shrink-0">{p.quantity} in stock · ${p.price}</span>
                            {p.sku && <span className="text-[#64748B] text-xs ml-2 font-mono">{p.sku}</span>}
                          </ResultRow>
                        ))}
                      </Section>
                    )}

                    {/* Customers */}
                    {data.customers.length > 0 && (
                      <Section icon={<Users size={13} />} label="Customers" color="text-blue-400">
                        {data.customers.map((c) => (
                          <ResultRow key={`c-${c.id}`} onClick={() => navigate('/customers')}>
                            <span className="text-white font-medium">{c.name}</span>
                            {c.phone && <span className="text-[#64748B] text-xs ml-2">{c.phone}</span>}
                            {c.email && <span className="text-[#64748B] text-xs ml-auto">{c.email}</span>}
                          </ResultRow>
                        ))}
                      </Section>
                    )}

                    {/* Orders */}
                    {data.orders.length > 0 && (
                      <Section icon={<ShoppingCart size={13} />} label="Orders" color="text-yellow-400">
                        {data.orders.map((o) => (
                          <ResultRow key={`o-${o.id}`} onClick={() => navigate('/orders')}>
                            <span className="text-white font-medium">Order #{o.id}</span>
                            <span className={clsx('text-xs ml-2', STATUS_COLOR[o.status] ?? 'text-[#94A3B8]')}>{o.status}</span>
                            <span className="text-[#64748B] text-xs ml-auto">${o.finalAmount.toFixed(2)}</span>
                          </ResultRow>
                        ))}
                      </Section>
                    )}

                    {/* Invoices */}
                    {data.invoices.length > 0 && (
                      <Section icon={<FileText size={13} />} label="Invoices" color="text-purple-400">
                        {data.invoices.map((inv) => (
                          <ResultRow key={`i-${inv.id}`} onClick={() => navigate('/invoices')}>
                            <span className="text-white font-mono text-sm">{inv.invoiceNumber}</span>
                            {inv.customerName && <span className="text-[#94A3B8] text-xs ml-2">{inv.customerName}</span>}
                            <span className="text-[#64748B] text-xs ml-auto">${inv.total.toFixed(2)}</span>
                          </ResultRow>
                        ))}
                      </Section>
                    )}

                    {/* Suppliers */}
                    {data.suppliers.length > 0 && (
                      <Section icon={<Truck size={13} />} label="Suppliers" color="text-orange-400">
                        {data.suppliers.map((s) => (
                          <ResultRow key={`s-${s.id}`} onClick={() => navigate('/suppliers')}>
                            <span className="text-white font-medium">{s.name}</span>
                            {s.phone && <span className="text-[#64748B] text-xs ml-2">{s.phone}</span>}
                          </ResultRow>
                        ))}
                      </Section>
                    )}

                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-dark-border flex items-center gap-3 text-[10px] text-[#64748B]">
                <span>↵ navigate</span>
                <span>ESC close</span>
                {data?.total && data.total > 0 && <span className="ml-auto">{data.total} result{data.total !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ icon, label, color, children }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={clsx('flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider', color)}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-dark-card/50 transition-colors text-left text-sm">
      {children}
    </button>
  );
}
