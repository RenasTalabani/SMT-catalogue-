'use client';
import { useState, useRef } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Loader2, Printer, Pencil } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

export default function CartPanel() {
  const { items, isOpen, closeCart, removeItem, updateQty, updatePrice, clear, total, itemCount } = useCartStore();
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  const startEditPrice = (id: number, currentPrice: number) => {
    setEditingPriceId(id);
    setEditingPriceVal(String(currentPrice));
    setTimeout(() => priceInputRef.current?.select(), 30);
  };

  const commitEditPrice = (id: number) => {
    const val = parseFloat(editingPriceVal);
    if (!isNaN(val) && val >= 0) updatePrice(id, parseFloat(val.toFixed(2)));
    setEditingPriceId(null);
  };
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment,       setPayment]       = useState('CASH');
  const [notes,         setNotes]         = useState('');
  const [discountType,  setDiscountType]  = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const [loading,       setLoading]       = useState(false);

  if (!isOpen) return null;

  const discountNum    = parseFloat(discountValue) || 0;
  const discountAmount = discountNum > 0
    ? discountType === 'PERCENTAGE'
      ? parseFloat(((total * discountNum) / 100).toFixed(2))
      : discountNum
    : 0;
  const finalTotal = Math.max(0, parseFloat((total - discountAmount).toFixed(2)));

  const checkout = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price })),
        paymentMethod: payment,
        notes:         notes || undefined,
        discount:      discountAmount,
        finalAmount:   finalTotal,
        totalAmount:   total,
      });
      const order = orderRes.data.data;

      // 2. Generate invoice — non-fatal if Invoice table not ready
      try {
        const invRes = await api.post(`/invoices/order/${order.id}`, {
          customerName:  customerName  || undefined,
          customerPhone: customerPhone || undefined,
          notes:         notes         || undefined,
          ...(discountNum > 0 ? { discountType, discountValue: discountNum } : {}),
        });
        const inv = invRes.data.data;
        toast.success(`Order #${order.id} — Invoice ${inv.invoiceNumber} created!`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes(''); setDiscountValue('');
        const token = localStorage.getItem('daraliraq_token') ?? '';
        window.open(`/api/invoices/${inv.id}/preview?token=${token}`, '_blank');
      } catch {
        // Invoice creation failed (e.g. table not yet migrated) — order still saved
        toast.success(`Order #${order.id} saved! (Invoice table not ready yet — run SQL migration in Supabase)`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes(''); setDiscountValue('');
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
                {/* Editable unit price */}
                <div className="flex items-center gap-1 mt-0.5">
                  {editingPriceId === item.id ? (
                    <input
                      ref={priceInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-20 text-xs bg-dark-surface border border-primary rounded px-1.5 py-0.5 text-primary font-semibold focus:outline-none"
                      value={editingPriceVal}
                      onChange={(e) => setEditingPriceVal(e.target.value)}
                      onBlur={() => commitEditPrice(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEditPrice(item.id);
                        if (e.key === 'Escape') setEditingPriceId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group"
                      title="Click to change price"
                      onClick={() => startEditPrice(item.id, item.price)}
                    >
                      <span className="font-semibold">${item.price.toFixed(2)}</span>
                      <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  )}
                  <span className="text-xs text-[#94A3B8]">each</span>
                </div>
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
          {/* Totals summary */}
          <div className="space-y-1">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">Subtotal</span>
                  <span className="text-[#94A3B8]">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Discount</span>
                  <span className="text-green-400">-${discountAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#94A3B8] text-sm">Total</span>
              <span className="text-xl font-bold text-primary">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Discount input */}
          <div className="flex gap-2">
            <select
              className="input text-sm w-20 flex-shrink-0"
              title="Discount type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'FIXED' | 'PERCENTAGE')}
            >
              <option value="FIXED">$</option>
              <option value="PERCENTAGE">%</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input w-full text-sm"
              placeholder="Discount (optional)"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
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
