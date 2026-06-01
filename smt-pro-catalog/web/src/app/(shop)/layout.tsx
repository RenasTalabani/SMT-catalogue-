import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DaralIraq Shop',
  description: 'Browse and order products online',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Shop header */}
      <header className="sticky top-0 z-30 border-b border-dark-border bg-dark-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/shop" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-brand">
              <span className="text-white text-sm font-bold">D</span>
            </div>
            <span className="font-bold text-white">DaralIraq</span>
            <span className="text-xs text-[#94A3B8]">Shop</span>
          </a>
          <a href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Staff Login →
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-dark-border py-6 text-center text-xs text-[#94A3B8]">
        DaralIraq Enterprise v3.0 · All rights reserved
      </footer>
    </div>
  );
}
