'use client';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetcher, api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';
import Image from 'next/image';
import { Plus, X, Pencil, Trash2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id:            number;
  name:          string;
  category:      string;
  price:         number;
  quantity:      number;
  lowStockAlert: number;
  isActive:      boolean;
  imageUrl:      string | null;
  description:   string | null;
  sku:           string | null;
}

interface ProductsResponse {
  products: Product[];
  total:    number;
  page:     number;
  pages:    number;
}

interface Category {
  id:       number;
  name:     string;
  children: Category[];
}

// ── Schema ───────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters'),
  category:      z.string().min(1, 'Category is required'),
  price:         z.coerce.number().positive('Price must be greater than 0'),
  quantity:      z.coerce.number().int().min(0, 'Quantity must be 0 or more'),
  lowStockAlert: z.coerce.number().int().min(0).default(5),
  description:   z.string().optional(),
  sku:           z.string().optional(),
  isActive:      z.boolean().default(true),
});
type ProductForm = z.infer<typeof productSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{children}</label>;
}

function flattenCategories(cats: Category[], prefix = ''): { id: number; name: string }[] {
  const result: { id: number; name: string }[] = [];
  for (const c of cats) {
    result.push({ id: c.id, name: prefix + c.name });
    if (c.children?.length) result.push(...flattenCategories(c.children, `${prefix}${c.name} / `));
  }
  return result;
}

// ── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({
  open, onClose, editProduct, categories,
}: {
  open:        boolean;
  onClose:     () => void;
  editProduct: Product | null;
  categories:  Category[];
}) {
  const qc     = useQueryClient();
  const isEdit = !!editProduct;

  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editProduct?.imageUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: editProduct ? {
      name:          editProduct.name,
      category:      editProduct.category,
      price:         editProduct.price,
      quantity:      editProduct.quantity,
      lowStockAlert: editProduct.lowStockAlert,
      description:   editProduct.description ?? '',
      sku:           editProduct.sku ?? '',
      isActive:      editProduct.isActive,
    } : { name: '', category: '', price: 0, quantity: 0, lowStockAlert: 5, description: '', sku: '', isActive: true },
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const mutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
      });
      if (imageFile) fd.append('image', imageFile);

      return isEdit
        ? api.put(`/products/${editProduct!.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      reset();
      setImageFile(null);
      setImagePreview(null);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open) return null;

  const flatCats = flattenCategories(categories);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-dark-surface border border-dark-border shadow-modal max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="overflow-y-auto p-6 space-y-4">

          {/* ── Image picker ── */}
          <div>
            <Label>Product Photo</Label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'relative flex h-24 w-24 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-colors',
                  imagePreview ? 'border-primary/40' : 'border-dark-border hover:border-primary/40',
                )}
              >
                {imagePreview ? (
                  <Image src={imagePreview} alt="preview" fill className="rounded-2xl object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[#94A3B8]">
                    <ImagePlus size={22} />
                    <span className="text-[10px]">Upload</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#94A3B8] mb-2">JPEG, PNG or WebP — max 5 MB</p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="btn-ghost text-xs py-1.5 px-3">
                  {imagePreview ? 'Change photo' : 'Choose photo'}
                </button>
                {imagePreview && (
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="ml-2 text-xs text-danger hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange} aria-label="Product photo" className="hidden" />
          </div>

          {/* ── Basic fields ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product Name *</Label>
              <input {...register('name')} placeholder="e.g. Component XR-200" className="input" />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
            </div>

            {/* Category select */}
            <div className="col-span-2">
              <Label>Category *</Label>
              {flatCats.length > 0 ? (
                <select {...register('category')} className="input">
                  <option value="">Select a category…</option>
                  {flatCats.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input {...register('category')} placeholder="e.g. Electronics" className="input" />
              )}
              {errors.category && <p className="mt-1 text-xs text-danger">{errors.category.message}</p>}
            </div>

            <div>
              <Label>SKU</Label>
              <input {...register('sku')} placeholder="e.g. SKU-001" className="input" />
            </div>
            <div>
              <Label>Price ($) *</Label>
              <input {...register('price')} type="number" step="0.01" min="0.01" placeholder="0.00" className="input" />
              {errors.price && <p className="mt-1 text-xs text-danger">{errors.price.message}</p>}
            </div>
            <div>
              <Label>Quantity *</Label>
              <input {...register('quantity')} type="number" min="0" placeholder="0" className="input" />
              {errors.quantity && <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>}
            </div>
            <div>
              <Label>Low Stock Alert</Label>
              <input {...register('lowStockAlert')} type="number" min="0" placeholder="5" className="input" />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <input {...register('isActive')} type="checkbox" id="isActive"
                className="h-4 w-4 rounded border-dark-border bg-dark-card accent-primary" />
              <label htmlFor="isActive" className="text-sm text-[#94A3B8]">Active (visible in catalog)</label>
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <textarea {...register('description')} rows={3} placeholder="Optional product description…"
                className="input resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(`/products/${product.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-dark-surface border border-dark-border shadow-modal p-6">
        <h2 className="text-base font-semibold text-white mb-2">Delete Product?</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          Are you sure you want to delete <span className="font-medium text-white">{product.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => del.mutate()} disabled={del.isPending}
            className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all">
            {del.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient();
  const [showModal,    setShowModal]    = useState(false);
  const [editProduct,  setEditProduct]  = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products'],
    queryFn:  () => fetcher('/products?limit=50'),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn:  () => fetcher<Category[]>('/categories?tree=true'),
  });

  useSocket(SocketEvent.productCreated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productUpdated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productDeleted, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.stockUpdated,   () => void qc.invalidateQueries({ queryKey: ['products'] }));

  const products   = data?.products ?? [];
  const openAdd    = () => { setEditProduct(null); setShowModal(true); };
  const openEdit   = (p: Product) => { setEditProduct(p); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditProduct(null); };

  return (
    <div className="flex flex-col">
      <Header title="Products" />

      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">
            {data?.total ?? 0} product{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
          <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Product
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  {['Product', 'Category', 'SKU', 'Price', 'Stock', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={clsx(
                      'px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#94A3B8]',
                      i <= 2 ? 'text-left' : i <= 4 ? 'text-right' : 'text-center',
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand glow-primary">
                          <Plus size={22} className="text-white" />
                        </div>
                        <p className="text-[#94A3B8]">No products yet</p>
                        <button type="button" onClick={openAdd} className="text-sm font-medium text-primary hover:underline">
                          Add your first product
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : products.map((p) => (
                  <tr key={p.id} className="hover:bg-dark-card transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} width={40} height={40}
                            className="rounded-xl object-cover h-10 w-10" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-[#94A3B8] truncate max-w-[200px]">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{p.category}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx('font-semibold', p.quantity <= p.lowStockAlert ? 'text-danger' : 'text-white')}>
                        {p.quantity}
                        {p.quantity <= p.lowStockAlert && <span className="ml-1 text-xs text-danger/70">(low)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium',
                        p.isActive ? 'bg-success/15 text-success' : 'bg-dark-card text-[#94A3B8]')}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => openEdit(p)} aria-label="Edit product"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-primary/20 hover:text-primary transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(p)} aria-label="Delete product"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-danger/20 hover:text-danger transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProductModal
        key={editProduct ? `edit-${editProduct.id}` : 'new'}
        open={showModal}
        onClose={closeModal}
        editProduct={editProduct}
        categories={categories}
      />
      {deleteTarget && (
        <DeleteConfirm product={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
