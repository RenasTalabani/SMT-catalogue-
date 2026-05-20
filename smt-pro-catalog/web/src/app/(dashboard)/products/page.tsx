'use client';
import { useState } from 'react';
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
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
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

// ── Validation ───────────────────────────────────────────────────────────────

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

// ── Modal ────────────────────────────────────────────────────────────────────

function ProductModal({
  open,
  onClose,
  editProduct,
}: {
  open: boolean;
  onClose: () => void;
  editProduct: Product | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!editProduct;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: editProduct
      ? {
          name:          editProduct.name,
          category:      editProduct.category,
          price:         editProduct.price,
          quantity:      editProduct.quantity,
          lowStockAlert: editProduct.lowStockAlert,
          description:   editProduct.description ?? '',
          sku:           editProduct.sku ?? '',
          isActive:      editProduct.isActive,
        }
      : {
          name: '', category: '', price: 0, quantity: 0,
          lowStockAlert: 5, description: '', sku: '', isActive: true,
        },
  });

  const mutation = useMutation({
    mutationFn: (data: ProductForm) =>
      isEdit
        ? api.put(`/products/${editProduct!.id}`, data)
        : api.post('/products', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      reset();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                placeholder="e.g. SMT Resistor 10kΩ"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                {...register('category')}
                placeholder="e.g. Resistors"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
              <input
                {...register('sku')}
                placeholder="e.g. RES-10K-0402"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('price')}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                {...register('quantity')}
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            </div>

            {/* Low Stock Alert */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Alert</label>
              <input
                {...register('lowStockAlert')}
                type="number"
                min="0"
                placeholder="5"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 col-span-2">
              <input
                {...register('isActive')}
                type="checkbox"
                id="isActive"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (visible in catalog)
              </label>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Optional product description…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Product?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {del.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal]     = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products'],
    queryFn:  () => fetcher('/products?limit=50'),
  });

  useSocket(SocketEvent.productCreated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productUpdated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productDeleted, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.stockUpdated,   () => void qc.invalidateQueries({ queryKey: ['products'] }));

  const products = data?.products ?? [];

  const openAdd  = () => { setEditProduct(null); setShowModal(true); };
  const openEdit = (p: Product) => { setEditProduct(p); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditProduct(null); };

  return (
    <div className="flex flex-col">
      <Header title="Products" />

      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.total ?? 0} product{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Plus className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">No products yet</p>
                        <button
                          type="button"
                          onClick={openAdd}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Add your first product
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} width={36} height={36} className="rounded-lg object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-500 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx('font-medium', p.quantity <= p.lowStockAlert ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                        {p.quantity}
                        {p.quantity <= p.lowStockAlert && (
                          <span className="ml-1 text-xs text-red-400">(low)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add / Edit modal */}
      <ProductModal
        open={showModal}
        onClose={closeModal}
        editProduct={editProduct}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
