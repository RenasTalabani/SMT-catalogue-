'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';
import Image from 'next/image';

interface Product {
  id:        number;
  name:      string;
  category:  string;
  price:     number;
  quantity:  number;
  lowStockAlert: number;
  isActive:  boolean;
  imageUrl:  string | null;
}

interface ProductsResponse {
  products: Product[];
  total:    number;
  page:     number;
  pages:    number;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products'],
    queryFn:  () => fetcher('/products?limit=50'),
  });

  useSocket(SocketEvent.productCreated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productUpdated, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.productDeleted, () => void qc.invalidateQueries({ queryKey: ['products'] }));
  useSocket(SocketEvent.stockUpdated,   () => void qc.invalidateQueries({ queryKey: ['products'] }));

  const products = data?.products ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Products" />
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No products found</td></tr>
                ) : products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} width={36} height={36} className="rounded-lg object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx('font-medium', p.quantity <= p.lowStockAlert ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
