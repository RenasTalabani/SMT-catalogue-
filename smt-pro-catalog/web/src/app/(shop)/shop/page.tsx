'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Plus, Minus, X, Search, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Product {
  id:          number;
  name:        string;
  description: string | null;
  price:       number;
  quantity:    number;
  imageUrl:    string | null;
  category:    string;
  unit:        string;
}

interface CartItem extends Product { qty: number; }

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER'];

export default function ShopPage() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [cart,      setCart]      = useState<CartItem[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [step,      setStep]      = useState<'cart' | 'checkout' | 'done'>('cart');
  const [submitting,setSubmitting]= useState(false);
  const [orderId,   setOrderId]   = useState<number | null>(null);

  const [form, setForm] = useState({
    customerName:  '',
    customerPhone: '',
    paymentMethod: 'CASH',
    notes:         '',
  });

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/shop/products?limit=48${search ? `&search=${search}` : ''}`)
      .then((r) => setProducts(r.data.data.products ?? []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [search]);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
    toast.success(`${p.name} added to cart`);
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { setCart((c) => c.filter((i) => i.id !== id)); return; }
    setCart((c) => c.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const total     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      toast.error('Name and phone are required'); return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/api/shop/order', {
        customerName:  form.customerName,
        customerPhone: form.customerPhone,
        paymentMethod: form.paymentMethod,
        notes:         form.notes || undefined,
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
      });
      setOrderId(res.data.data.order.id);
      setStep('done');
      setCart([]);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message ?? 'Order failed' : 'Order failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Search bar */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Our Products</h1>
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="input pl-9 w-full"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Floating cart button */}
      {itemCount > 0 && (
        <button
          type="button"
          onClick={() => { setCartOpen(true); setStep('cart'); }}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-2xl gradient-brand px-5 py-3 text-white shadow-2xl font-semibold"
        >
          <ShoppingCart size={18} />
          {itemCount} item{itemCount > 1 ? 's' : ''} · ${total.toFixed(2)}
        </button>
      )}

      {/* Products grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-primary" /></div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-[#94A3B8]">No products found</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="card rounded-2xl overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-dark-card">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-[#94A3B8]">
                    {p.name.charAt(0)}
                  </div>
                )}
                {p.quantity === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold text-white">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-sm font-semibold text-white line-clamp-2">{p.name}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{p.category}</p>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-primary">${p.price.toFixed(2)}</span>
                  <button
                    type="button"
                    disabled={p.quantity === 0}
                    onClick={() => addToCart(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl gradient-brand text-white disabled:opacity-40 transition-opacity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart / Checkout drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-dark-surface border-l border-dark-border flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <h2 className="font-bold text-white">
                {step === 'cart' ? `Cart (${itemCount})` : step === 'checkout' ? 'Your Details' : 'Order Placed!'}
              </h2>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close" title="Close"
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            {/* Step: Cart */}
            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-dark-card rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.name}</p>
                        <p className="text-xs text-primary">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => updateQty(item.id, item.qty - 1)}
                          className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary">
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-bold text-white w-5 text-center">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.id, item.qty + 1)}
                          className="h-6 w-6 rounded-lg bg-dark-surface flex items-center justify-center hover:bg-primary/20 text-[#94A3B8] hover:text-primary">
                          <Plus size={11} />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-white w-14 text-right">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dark-border p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Total</span>
                    <span className="text-xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                  <button type="button" onClick={() => setStep('checkout')} disabled={cart.length === 0}
                    className="btn-primary w-full py-3">Proceed to Checkout</button>
                </div>
              </>
            )}

            {/* Step: Checkout */}
            {step === 'checkout' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  <input className="input w-full" placeholder="Your name *"
                    value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  <input className="input w-full" placeholder="Phone number *" type="tel"
                    value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                  <select className="input w-full" value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <textarea className="input w-full resize-none" rows={3} placeholder="Special instructions (optional)"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  <div className="bg-dark-card rounded-xl p-3 text-sm">
                    <p className="text-[#94A3B8] mb-1">Order summary</p>
                    {cart.map((i) => (
                      <div key={i.id} className="flex justify-between text-white py-0.5">
                        <span>{i.name} × {i.qty}</span>
                        <span>${(i.price * i.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-dark-border mt-2 pt-2 flex justify-between font-bold text-primary">
                      <span>Total</span><span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-dark-border p-4 space-y-2">
                  <button type="button" onClick={placeOrder} disabled={submitting}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Placing order…</> : 'Place Order'}
                  </button>
                  <button type="button" onClick={() => setStep('cart')}
                    className="btn-ghost w-full text-sm">← Back to cart</button>
                </div>
              </>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle size={40} className="text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Order Placed!</h3>
                <p className="text-[#94A3B8] text-sm">
                  Order #{orderId} has been received. We will contact you shortly.
                </p>
                <button type="button" onClick={() => { setCartOpen(false); setStep('cart'); }}
                  className="btn-primary px-8">Continue Shopping</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
