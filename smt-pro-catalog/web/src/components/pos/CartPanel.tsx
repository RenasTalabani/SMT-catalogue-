'use client';
import { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Loader2, Printer } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

export default function CartPanel() {
  const { items, isOpen, closeCart, removeItem, updateQty, clear, total, itemCount } = useCartStore();
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment,       setPayment]       = useState('CASH');
  const [notes,         setNotes]         = useState('');
  const [loading,       setLoading]       = useState(false);

  if (!isOpen) return null;

  const checkout = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price })),
        paymentMethod: payment,
        notes: notes || undefined,
        finalAmount: total,
        totalAmount: total,
      });
      const order = orderRes.data.data;

      // 2. Generate invoice — non-fatal if Invoice table not ready
      try {
        const invRes = await api.post(`/invoices/order/${order.id}`, {
          customerName:  customerName  || undefined,
          customerPhone: customerPhone || undefined,
          notes:         notes         || undefined,
        });
        const inv = invRes.data.data;
        toast.success(`Order #${order.id} — Invoice ${inv.invoiceNumber} created!`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes('');
        window.open(`/api/invoices/${inv.id}/preview`, '_blank');
      } catch {
        // Invoice creation failed (e.g. table not yet migrated) — order still saved
        toast.success(`Order #${order.id} saved! (Invoice table not ready yet — run SQL migration in Supabase)`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes('');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={closeCart} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-dark-surface border-l border-dark-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-bold text-white">Cart ({itemCount})</h2>
          </div>
          <button type="button" onClick={closeCart} title="Close cart" aria-label="Close cart"
            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#94A3B8]">
              <ShoppingCart size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click Sell on any product</p>
            </div>
          ) : items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-dark-card rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-xs text-primary">${item.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" title="Decrease quantity" aria-label="Decrease quantity"
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary transition-colors">
                  <Minus size={11} />
                </button>
                <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                <button type="button" title="Increase quantity" aria-label="Increase quantity"
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary transition-colors">
                  <Plus size={11} />
                </button>
              </div>
              <div className="w-14 text-right">
                <p className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button type="button" title="Remove item" aria-label="Remove item"
                onClick={() => removeItem(item.id)}
                className="p-1 rounded-lg hover:bg-danger/20 text-[#94A3B8] hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Checkout form */}
        <div className="border-t border-dark-border px-4 py-4 space-y-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#94A3B8]">Total</span>
            <span className="text-xl font-bold text-primary">${total.toFixed(2)}</span>
          </div>

          <input className="input w-full text-sm" placeholder="Customer name (optional)"
            value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="input w-full text-sm" placeholder="Phone (optional)"
            value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

          <select className="input w-full text-sm" title="Payment method" aria-label="Payment method" value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <textarea className="input w-full text-sm resize-none" rows={2} placeholder="Notes (optional)"
            value={notes} onChange={(e) => setNotes(e.target.value)} />

          <button type="button" onClick={checkout} disabled={loading || items.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {loading ? 'Processing…' : 'Checkout & Print Invoice'}
          </button>
        </div>
      </div>
    </>
  );
}
