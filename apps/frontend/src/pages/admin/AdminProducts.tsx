import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toggle } from '../../components/ui/Toggle';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ProductModal, type ProductFormData } from '../../components/admin/ProductModal';
import { productsApi, type Product } from '../../lib/api';
import type { User } from '../../types';

type Category = 'All' | 'Shake' | 'Tea' | 'Bar' | 'Suplemen' | 'Program';
const categories: Category[] = ['All', 'Shake', 'Tea', 'Bar', 'Suplemen', 'Program'];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Shake: { bg: 'bg-brand-primary-soft', text: 'text-brand-primary', border: 'border-brand-primary/20' },
  Tea: { bg: 'bg-brand-accent-soft', text: 'text-brand-accent', border: 'border-brand-accent/20' },
  Bar: { bg: 'bg-information-soft', text: 'text-information', border: 'border-information/20' },
  Suplemen: { bg: 'bg-warning-soft', text: 'text-warning', border: 'border-warning/20' },
  Program: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/20' },
};

const categoryBgColors: Record<string, string> = {
  Shake: '#DDF4EA', Tea: '#FFF5D6', Bar: '#D6E6F7', Suplemen: '#FFF0C0', Program: '#D1EADD',
};

 
export default function AdminProducts({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    productsApi.list().then(res => {
      if (res.success && res.data) setProducts(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleActive = (id: string, checked: boolean) => {
    productsApi.update(id, { isActive: checked }).then(res => {
      if (res.success && res.data) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: res.data!.isActive } : p));
      }
    }).catch(() => {});
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    if (editingProduct) {
      const res = await productsApi.update(editingProduct.id, data);
      if (res.success && res.data) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...res.data! } : p));
      }
    } else {
      const res = await productsApi.create(data as any);
      if (res.success && res.data) {
        setProducts(prev => [res.data!, ...prev]);
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!productToDelete) return;
    productsApi.remove(productToDelete.id).then(res => {
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      }
    }).catch(() => {}).finally(() => {
      setDeleteModalOpen(false);
      setProductToDelete(null);
    });
  };

  const getCategoryBadge = (cat: string) => {
    const colors = categoryColors[cat] || categoryColors['Shake'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
        {cat}
      </span>
    );
  };

  return (
    <AdminLayout user={user} title="Manajemen Produk" onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manajemen Produk</h1>
            <p className="text-foreground-muted mt-1 text-sm">
              Kelola semua produk Herbalife yang tersedia di toko NC Mulia
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} size="md" onClick={handleAddClick}>
            Tambah Produk
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => {
              const count = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
              const isActive = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                    isActive
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-surface text-foreground-muted border-border hover:border-brand-primary/40 hover:text-foreground',
                  ].join(' ')}
                >
                  {cat}
                  <span className={[
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-secondary text-foreground-subtle',
                  ].join(' ')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const bgColor = categoryBgColors[product.category] || categoryBgColors['Shake'];
              const initials = product.category.slice(0, 2).toUpperCase();
              return (
                <Card key={product.id} padding="none" hover className="overflow-hidden group relative">
                  <div className="h-40 flex items-center justify-center relative" style={{ backgroundColor: bgColor }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-black/15 select-none">{initials}</span>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant={product.isActive ? 'success' : 'neutral'} dot>
                        {product.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex items-center justify-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-white/90 text-foreground hover:bg-white flex items-center justify-center transition-colors shadow-sm" title="Edit Produk" onClick={() => handleEditClick(product)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg bg-white/90 text-danger hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                          title="Hapus Produk"
                          onClick={() => handleDeleteClick(product)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">{getCategoryBadge(product.category)}</div>
                    <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-lg font-bold text-brand-primary">
                        Rp {(product.pricing?.finalPrice ?? product.basePrice ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-muted">Aktif:</span>
                      <Toggle
                        checked={product.isActive}
                        onChange={(e) => handleToggleActive(product.id, e.target.checked)}
                        aria-label={`Toggle ${product.name}`}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card padding="lg" className="text-center">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center text-foreground-subtle mb-4">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Tidak ada produk ditemukan</h3>
              <p className="text-sm text-foreground-muted max-w-sm mb-4">
                Coba ubah kata kunci pencarian atau pilih kategori lain
              </p>
              <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setCategoryFilter('All'); }}>
                Reset Filter
              </Button>
            </div>
          </Card>
        )}

        {filteredProducts.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-xs text-foreground-muted">
            <span>Menampilkan {filteredProducts.length} dari {products.length} produk</span>
          </div>
        )}

        <Modal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setProductToDelete(null); }} title="Hapus Produk" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted leading-relaxed">
              Apakah Anda yakin ingin menghapus produk <span className="font-semibold text-foreground">{productToDelete?.name}</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setDeleteModalOpen(false); setProductToDelete(null); }}>Batal</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>Hapus</Button>
            </div>
          </div>
        </Modal>

        <ProductModal
          open={productModalOpen}
          onClose={() => { setProductModalOpen(false); setEditingProduct(null); }}
          product={editingProduct}
          onSave={handleSaveProduct}
        />
      </div>
    </AdminLayout>
  );
}
