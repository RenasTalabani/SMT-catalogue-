'use client';
import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  endpoint:  string;          // e.g. '/export/products'
  filename?: string;
  extraParams?: Record<string, string>;
}

export default function ExportButton({ endpoint, filename, extraParams }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  const download = (format: 'excel' | 'csv') => {
    setOpen(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('daraliraq_token') ?? '' : '';
    const params = new URLSearchParams({ format, token, ...(extraParams ?? {}) });
    const url = `/api${endpoint}?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename ?? 'export'}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${format.toUpperCase()}…`);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 btn-secondary text-sm">
        <Download size={14} /> Export <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 card rounded-xl overflow-hidden min-w-[140px] shadow-xl">
            <button type="button" onClick={() => download('excel')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#CBD5E1] hover:bg-dark-card hover:text-white transition-colors">
              📊 Excel (.xlsx)
            </button>
            <button type="button" onClick={() => download('csv')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#CBD5E1] hover:bg-dark-card hover:text-white transition-colors">
              📄 CSV (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
