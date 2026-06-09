import { create } from 'zustand';

export interface CartItem {
  id:            number;
  name:          string;
  price:         number;   // current sale price (may be edited)
  originalPrice: number;   // catalog price — never changes after add
  discountPrice?: number | null; // preset discount price from product config
  quantity:      number;
  imageUrl?:     string | null;
}

interface CartStore {
  items:           CartItem[];
  isOpen:          boolean;
  addItem:         (product: Omit<CartItem, 'quantity' | 'originalPrice'>) => void;
  removeItem:      (id: number) => void;
  updateQty:       (id: number, qty: number) => void;
  updatePrice:     (id: number, price: number) => void;
  clear:           () => void;
  openCart:        () => void;
  closeCart:       () => void;
  total:           number;
  itemCount:       number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items:  [],
  isOpen: false,

  addItem: (product) => {
    set((s) => {
      const existing = s.items.find((i) => i.id === product.id);
      if (existing) {
        return { items: s.items.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i), isOpen: true };
      }
      return { items: [...s.items, { ...product, originalPrice: product.price, quantity: 1 }], isOpen: true };
    });
  },

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) => {
    if (qty <= 0) { get().removeItem(id); return; }
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, quantity: qty } : i) }));
  },

  updatePrice: (id, price) => {
    if (price < 0) return;
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, price } : i) }));
  },

  clear:     () => set({ items: [], isOpen: false }),
  openCart:  () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  get total()     { return parseFloat(get().items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)); },
  get itemCount() { return get().items.reduce((s, i) => s + i.quantity, 0); },
}));
