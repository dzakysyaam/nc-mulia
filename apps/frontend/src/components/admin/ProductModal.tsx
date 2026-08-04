import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Product } from '../../lib/api';

const categories = ['Shake', 'Tea', 'Bar', 'Suplemen', 'Program'];

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (data: ProductFormData) => Promise<void>;
}

export interface ProductFormData {
  name: string;
  category: string;
  description: string;
  benefits: string;
  price: number;
  stock: number;
  imageUrl: string;
  isAvailable: boolean;
  isMemberDiscountEligible: boolean;
}

export function ProductModal({ open, onClose, product, onSave }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    category: 'Shake',
    description: '',
    benefits: '',
    price: 0,
    stock: 0,
    imageUrl: '',
    isAvailable: true,
    isMemberDiscountEligible: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name,
          category: product.category,
          description: product.description ?? '',
          benefits: product.benefits ?? '',
          price: Number(product.price ?? product.basePrice ?? 0),
          stock: Number(product.stock ?? 0),
          imageUrl: product.imageUrl ?? '',
          isAvailable: product.isAvailable ?? true,
          isMemberDiscountEligible: product.isMemberDiscountEligible ?? true,
        });
      } else {
        setForm({ name: '', category: 'Shake', description: '', benefits: '', price: 0, stock: 0, imageUrl: '', isAvailable: true, isMemberDiscountEligible: true });
      }
      setError('');
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nama produk wajib diisi.'); return; }
    if (!form.price || form.price <= 0) { setError('Harga harus lebih dari 0.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof ProductFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={product ? 'Edit Produk' : 'Tambah Produk'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Nama Produk *</label>
            <Input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Contoh: Herbalife Shake Vanila"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Kategori *</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Harga (Rp) *</label>
            <Input
              type="number"
              value={form.price}
              onChange={e => update('price', Number(e.target.value))}
              placeholder="0"
              min={0}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Stok</label>
            <Input
              type="number"
              value={form.stock}
              onChange={e => update('stock', Number(e.target.value))}
              placeholder="0"
              min={0}
              className="w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Deskripsi produk..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Manfaat</label>
            <textarea
              value={form.benefits}
              onChange={e => update('benefits', e.target.value)}
              placeholder="Manfaat produk..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">URL Gambar</label>
            <Input
              value={form.imageUrl}
              onChange={e => update('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full"
            />
          </div>
          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={e => update('isAvailable', e.target.checked)}
                className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-foreground">Tersedia</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMemberDiscountEligible}
                onChange={e => update('isMemberDiscountEligible', e.target.checked)}
                className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-foreground">Eligible Diskon Member</span>
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Menyimpan...' : (product ? 'Simpan Perubahan' : 'Tambah Produk')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
