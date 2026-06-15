'use client';
import { useState, useRef } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Loader2, Printer, Pencil, Tag } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

export default function CartPanel() {
  const { items, isOpen, closeCart, removeItem, updateQty, updatePrice, clear, total, itemCount } = useCartStore();

  // Price editing state
  const [editingPriceId,  setEditingPriceId]  = useState<number | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Quantity editing state
  const [editingQtyId,  setEditingQtyId]  = useState<number | null>(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Checkout form state
  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [payment,         setPayment]         = useState('CASH');
  const [notes,           setNotes]           = useState('');
  const [discountType,    setDiscountType]    = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue,   setDiscountValue]   = useState('');
  const [isLoan,          setIsLoan]          = useState(false);
  const [initialPayment,  setInitialPayment]  = useState('');
  const [loading,         setLoading]         = useState(false);

  if (!isOpen) return null;

  // ── Price edit helpers ──────────────────────────────────────────────────────
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

  // ── Quantity edit helpers ───────────────────────────────────────────────────
  const startEditQty = (id: number, currentQty: number) => {
    setEditingQtyId(id);
    setEditingQtyVal(String(currentQty));
    setTimeout(() => { qtyInputRef.current?.select(); }, 30);
  };

  const commitEditQty = (id: number) => {
    const val = parseInt(editingQtyVal, 10);
    if (!isNaN(val) && val >= 1) updateQty(id, val);
    setEditingQtyId(null);
  };

  // ── Totals calculation ──────────────────────────────────────────────────────
  // total (from store) = sum of salePrice × qty
  const originalSubtotal  = parseFloat(items.reduce((s, i) => s + i.originalPrice * i.quantity, 0).toFixed(2));
  const itemDiscountTotal = parseFloat((originalSubtotal - total).toFixed(2));

  const cartDiscountNum    = parseFloat(discountValue) || 0;
  const cartDiscountAmount = cartDiscountNum > 0
    ? discountType === 'PERCENTAGE'
      ? parseFloat(((total * cartDiscountNum) / 100).toFixed(2))
      : cartDiscountNum
    : 0;

  const finalTotal        = Math.max(0, parseFloat((total - cartDiscountAmount).toFixed(2)));
  const totalSaved        = parseFloat((itemDiscountTotal + cartDiscountAmount).toFixed(2));

  // ── Checkout ────────────────────────────────────────────────────────────────
  const checkout = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      const orderRes = await api.post('/orders', {
        items:         items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price })),
        paymentMethod: payment,
        notes:         notes || undefined,
        discount:      cartDiscountAmount,
        finalAmount:   finalTotal,
        totalAmount:   originalSubtotal,
      });
      const order = orderRes.data.data;

      try {
        const initialPmt = isLoan ? (parseFloat(initialPayment) || 0) : 0;
        const invRes = await api.post(`/invoices/order/${order.id}`, {
          customerName:  customerName  || undefined,
          customerPhone: customerPhone || undefined,
          notes:         notes         || undefined,
          ...(cartDiscountNum > 0 ? { discountType, discountValue: cartDiscountNum } : {}),
          ...(isLoan ? { isLoan: true, initialPayment: initialPmt } : {}),
        });
        const inv = invRes.data.data;
        const loanMsg = isLoan ? ` (Loan — paid $${initialPmt.toFixed(2)})` : '';
        toast.success(`Order #${order.id} — Invoice ${inv.invoiceNumber} created!${loanMsg}`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes(''); setDiscountValue('');
        setIsLoan(false); setInitialPayment('');
        const token = localStorage.getItem('daraliraq_token') ?? '';
        window.open(`/api/invoices/${inv.id}/preview?token=${token}`, '_blank');
      } catch {
        toast.success(`Order #${order.id} saved!`);
        clear();
        setCustomerName(''); setCustomerPhone(''); setNotes(''); setDiscountValue('');
        setIsLoan(false); setInitialPayment('');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={closeCart} />

      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-dark-surface border-l border-dark-border flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-bold text-white">Cart ({itemCount})</h2>
          </div>
          <button type="button" onClick={closeCart} title="Close cart"
            className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#94A3B8]">
              <ShoppingCart size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click Sell on any product</p>
            </div>
          ) : items.map((item) => {
            const unitDiscount  = parseFloat((item.originalPrice - item.price).toFixed(2));
            const hasDiscount   = unitDiscount > 0;
            const discountPct   = hasDiscount
              ? parseFloat(((unitDiscount / item.originalPrice) * 100).toFixed(1))
              : 0;
            const lineOriginal  = parseFloat((item.originalPrice * item.quantity).toFixed(2));
            const lineSale      = parseFloat((item.price * item.quantity).toFixed(2));
            const lineSaved     = parseFloat((unitDiscount * item.quantity).toFixed(2));

            return (
              <div key={item.id} className="bg-dark-card rounded-xl p-3 space-y-2">

                {/* Row 1: name + qty + remove */}
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white flex-1 truncate">{item.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" title="Decrease" onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary transition-colors">
                      <Minus size={10} />
                    </button>

                    {editingQtyId === item.id ? (
                      <input
                        ref={qtyInputRef}
                        type="number" min="1" step="1"
                        className="w-14 h-6 text-xs bg-dark-surface border border-primary rounded px-1 text-white font-bold text-center focus:outline-none"
                        value={editingQtyVal}
                        onChange={(e) => setEditingQtyVal(e.target.value)}
                        onBlur={() => commitEditQty(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  commitEditQty(item.id);
                          if (e.key === 'Escape') setEditingQtyId(null);
                        }}
                      />
                    ) : (
                      <span
                        title="Click to type quantity"
                        onClick={() => startEditQty(item.id, item.quantity)}
                        className="text-sm font-bold text-white w-8 text-center cursor-text select-none hover:text-primary transition-colors"
                      >
                        {item.quantity}
                      </span>
                    )}

                    <button type="button" title="Increase" onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary transition-colors">
                      <Plus size={10} />
                    </button>
                  </div>
                  {item.unit && (
                    <span className="text-[10px] text-[#64748B] flex-shrink-0">{item.unit}</span>
                  )}
                  <button type="button" title="Remove" onClick={() => removeItem(item.id)}
                    className="p-1 rounded-lg hover:bg-danger/20 text-[#94A3B8] hover:text-danger transition-colors flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Row 2: price toggle + edit */}
                <div className="space-y-1.5">
                  {/* Preset price toggle — shown when product has a discountPrice */}
                  {item.discountPrice && item.discountPrice > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePrice(item.id, item.originalPrice)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                          Math.abs(item.price - item.originalPrice) < 0.01
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-dark-border text-[#64748B] hover:border-primary/40 hover:text-white'
                        }`}
                      >
                        Regular ${item.originalPrice.toFixed(2)}
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePrice(item.id, item.discountPrice!)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                          Math.abs(item.price - item.discountPrice) < 0.01
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'border-dark-border text-[#64748B] hover:border-green-500/40 hover:text-green-400'
                        }`}
                      >
                        Discount ${item.discountPrice.toFixed(2)}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Original price (shown as strikethrough if discounted) */}
                    {hasDiscount && (
                      <span className="text-xs text-[#64748B] line-through">${item.originalPrice.toFixed(2)}</span>
                    )}

                    {/* Sale price (editable) */}
                    {editingPriceId === item.id ? (
                      <input
                        ref={priceInputRef}
                        type="number" min="0" step="0.01"
                        className="w-20 text-xs bg-dark-surface border border-primary rounded px-1.5 py-0.5 text-primary font-bold focus:outline-none"
                        value={editingPriceVal}
                        onChange={(e) => setEditingPriceVal(e.target.value)}
                        onBlur={() => commitEditPrice(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  commitEditPrice(item.id);
                          if (e.key === 'Escape') setEditingPriceId(null);
                        }}
                      />
                    ) : (
                      <button type="button" title="Click to change price"
                        onClick={() => startEditPrice(item.id, item.price)}
                        className="flex items-center gap-1 group">
                        <span className={`text-sm font-bold ${hasDiscount ? 'text-green-400' : 'text-primary'}`}>
                          ${item.price.toFixed(2)}
                        </span>
                        <Pencil size={9} className="text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    <span className="text-xs text-[#64748B]">each</span>

                    {/* Discount % badge */}
                    {hasDiscount && (
                      <span className="inline-flex items-center gap-0.5 bg-green-500/15 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        <Tag size={8} />
                        -{discountPct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: line totals */}
                <div className="flex items-center justify-between pt-1 border-t border-dark-border/50">
                  <div className="text-xs text-[#64748B]">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </div>
                  <div className="text-right">
                    {hasDiscount && (
                      <p className="text-[10px] text-[#64748B] line-through">${lineOriginal.toFixed(2)}</p>
                    )}
                    <p className="text-sm font-bold text-white">${lineSale.toFixed(2)}</p>
                    {hasDiscount && (
                      <p className="text-[10px] text-green-400">saved ${lineSaved.toFixed(2)}</p>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* ── Checkout form ── */}
        <div className="border-t border-dark-border px-4 py-3 space-y-3 flex-shrink-0">

          {/* Full price breakdown */}
          <div className="bg-dark-card rounded-xl p-3 space-y-1.5 text-sm">
            {itemDiscountTotal > 0 && (
              <>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Original price</span>
                  <span>${originalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>Item discounts</span>
                  <span>-${itemDiscountTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </>
            )}

            {cartDiscountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Extra discount</span>
                <span>-${cartDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-dark-border">
              <span className="font-semibold text-white">Total</span>
              <span className="text-xl font-bold text-primary">${finalTotal.toFixed(2)}</span>
            </div>

            {totalSaved > 0 && (
              <div className="flex justify-between text-[10px] text-green-400 font-medium">
                <span>Customer saves</span>
                <span>${totalSaved.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Extra cart-level discount */}
          <div className="flex gap-2">
            <select className="input text-sm w-20 flex-shrink-0" title="Discount type"
              value={discountType} onChange={(e) => setDiscountType(e.target.value as 'FIXED' | 'PERCENTAGE')}>
              <option value="FIXED">$ off</option>
              <option value="PERCENTAGE">% off</option>
            </select>
            <input type="number" min="0" step="0.01" className="input w-full text-sm"
              placeholder="Extra discount on total (optional)"
              value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>

          <input className="input w-full text-sm" placeholder="Customer name (optional)"
            value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="input w-full text-sm" placeholder="Phone (optional)"
            value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

          <select className="input w-full text-sm" title="Payment method" value={payment}
            onChange={(e) => setPayment(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <textarea className="input w-full text-sm resize-none" rows={2} placeholder="Notes (optional)"
            value={notes} onChange={(e) => setNotes(e.target.value)} />

          {/* Loan / installment toggle */}
          <div className="bg-dark-card rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLoan}
                onChange={(e) => { setIsLoan(e.target.checked); if (!e.target.checked) setInitialPayment(''); }}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-semibold text-white">Loan / Installment</span>
              <span className="text-[10px] text-[#94A3B8]">(customer pays later)</span>
            </label>
            {isLoan && (
              <div className="space-y-1.5">
                <p className="text-xs text-[#94A3B8]">
                  Total: <span className="text-white font-bold">${finalTotal.toFixed(2)}</span>
                  {parseFloat(initialPayment) > 0 && (
                    <span className="ml-2 text-red-400 font-bold">
                      Remaining: ${Math.max(0, finalTotal - (parseFloat(initialPayment) || 0)).toFixed(2)}
                    </span>
                  )}
                </p>
                <input
                  type="number" min="0" step="0.01"
                  className="input w-full text-sm"
                  placeholder={`Initial payment (max $${finalTotal.toFixed(2)})`}
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                />
              </div>
            )}
          </div>

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
