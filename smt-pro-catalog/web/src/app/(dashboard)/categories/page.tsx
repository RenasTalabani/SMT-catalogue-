'use client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import Header from '@/components/layout/Header';
import { Plus, X, Pencil, Trash2, Tag, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface Category {
  id:          number;
  name:        string;
  nameAr:      string | null;
  nameKu:      string | null;
  slug:        string;
  description: string | null;
  imageUrl:    string | null;
  order:       number;
  isActive:    boolean;
  parentId:    number | null;
  createdAt:   string;
  children:    Category[];
  _count?:     { products: number };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{children}</label>;
}

function CategoryModal({
  open,
  onClose,
  editCat,
  allCats,
}: {
  open:    boolean;
  onClose: () => void;
  editCat: Category | null;
  allCats: Category[];
}) {
  const qc     = useQueryClient();
  const isEdit = !!editCat;

  const [name,     setName]     = useState(editCat?.name        ?? '');
  const [nameAr,   setNameAr]   = useState(editCat?.nameAr      ?? '');
  const [nameKu,   setNameKu]   = useState(editCat?.nameKu      ?? '');
  const [slug,     setSlug]     = useState(editCat?.slug        ?? '');
  const [desc,     setDesc]     = useState(editCat?.description ?? '');
  const [order,    setOrder]    = useState(String(editCat?.order ?? 0));
  const [parentId, setParentId] = useState(editCat?.parentId ? String(editCat.parentId) : '');
  const [isActive, setIsActive] = useState(editCat?.isActive ?? true);

  const onNameChange = (v: string) => {
    setName(v);
    if (!isEdit) setSlug(slugify(v));
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.put(`/categories/${editCat!.id}`, data).then(r => r.data)
        : api.post('/categories', data).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(isEdit ? 'Category updated' : 'Category created');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (!slug.trim()) return toast.error('Slug is required');
    mutation.mutate({
      name:        name.trim(),
      slug:        slug.trim(),
      nameAr:      nameAr.trim() || undefined,
      nameKu:      nameKu.trim() || undefined,
      description: desc.trim()   || undefined,
      order:       parseInt(order) || 0,
      parentId:    parentId ? parseInt(parentId) : null,
      isActive,
    });
  };

  if (!open) return null;

  const flatParents = allCats.filter(c => c.id !== editCat?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-dark-surface border border-dark-border shadow-modal max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <Label>Name (English) *</Label>
            <input value={name} onChange={e => onNameChange(e.target.value)}
              placeholder="e.g. Electronics" className="input" />
          </div>

          {/* Slug */}
          <div>
            <Label>Slug *</Label>
            <input value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="e.g. electronics" className="input font-mono text-xs" />
            <p className="mt-1 text-xs text-[#94A3B8]">Lowercase letters, numbers, hyphens only</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name (Arabic)</Label>
              <input value={nameAr} onChange={e => setNameAr(e.target.value)}
                placeholder="الاسم بالعربية" className="input" dir="rtl" />
            </div>
            <div>
              <Label>Name (Kurdish)</Label>
              <input value={nameKu} onChange={e => setNameKu(e.target.value)}
                placeholder="ناوی کوردی" className="input" />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="Optional description…" className="input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Parent Category</Label>
              <select value={parentId} onChange={e => setParentId(e.target.value)}
                className="input">
                <option value="">None (top-level)</option>
                {flatParents.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <input type="number" value={order} onChange={e => setOrder(e.target.value)}
                min="0" className="input" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="catActive" checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-dark-border bg-dark-card accent-primary" />
            <label htmlFor="catActive" className="text-sm text-[#94A3B8]">Active (visible to users)</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ cat, onClose }: { cat: Category; onClose: () => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(`/categories/${cat.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-dark-surface border border-dark-border shadow-modal p-6">
        <h2 className="text-base font-semibold text-white mb-2">Delete Category?</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          Delete <span className="font-medium text-white">{cat.name}</span>? Subcategories will be deactivated.
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

function CategoryRow({
  cat,
  level,
  onEdit,
  onDelete,
}: {
  cat:      Category;
  level:    number;
  onEdit:   (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = cat.children && cat.children.length > 0;

  return (
    <>
      <tr className="hover:bg-dark-card transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: level * 20 }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(v => !v)} aria-label="Toggle children"
                className="flex h-5 w-5 items-center justify-center rounded text-[#94A3B8] hover:text-white transition-colors">
                <ChevronRight size={14} className={clsx('transition-transform', expanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Tag size={13} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{cat.name}</p>
              {cat.nameAr && <p className="text-xs text-[#94A3B8]" dir="rtl">{cat.nameAr}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{cat.slug}</td>
        <td className="px-4 py-3 text-center">
          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium',
            cat.isActive ? 'bg-success/15 text-success' : 'bg-dark-card text-[#94A3B8]')}>
            {cat.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-center text-[#94A3B8] text-sm">{cat._count?.products ?? 0}</td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button onClick={() => onEdit(cat)} aria-label="Edit category"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-primary/20 hover:text-primary transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(cat)} aria-label="Delete category"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-danger/20 hover:text-danger transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {hasChildren && expanded && cat.children.map(child => (
        <CategoryRow key={child.id} cat={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showModal,    setShowModal]    = useState(false);
  const [editCat,      setEditCat]      = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: cats = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn:  () => fetcher<Category[]>('/categories?tree=true&includeInactive=true'),
  });

  const flatCats: Category[] = [];
  const flatten = (list: Category[]) => list.forEach(c => { flatCats.push(c); if (c.children) flatten(c.children); });
  flatten(cats);

  const openAdd  = () => { setEditCat(null); setShowModal(true); };
  const openEdit = (c: Category) => { setEditCat(c); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditCat(null); };

  void qc; // suppress unused warning

  return (
    <div className="flex flex-col">
      <Header title="Categories" />

      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">{flatCats.length} categor{flatCats.length !== 1 ? 'ies' : 'y'}</p>
          <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Category
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Slug</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Products</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : cats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand glow-primary">
                          <Tag size={22} className="text-white" />
                        </div>
                        <p className="text-[#94A3B8]">No categories yet</p>
                        <button type="button" onClick={openAdd} className="text-sm font-medium text-primary hover:underline">
                          Add your first category
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : cats.map(cat => (
                  <CategoryRow key={cat.id} cat={cat} level={0} onEdit={openEdit} onDelete={setDeleteTarget} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CategoryModal
        open={showModal}
        onClose={closeModal}
        editCat={editCat}
        allCats={flatCats}
      />
      {deleteTarget && (
        <DeleteConfirm cat={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
