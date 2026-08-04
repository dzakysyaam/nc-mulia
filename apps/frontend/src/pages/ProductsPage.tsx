import { useState, useEffect } from 'react';
import { productsApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import type { Product, User } from '../lib/api';

interface ProductsPageProps { user?: User | null; }

function getBasePrice(p: Product): number {
  return p.basePrice ?? 0;
}

function getEffectivePrice(p: Product): number {
  return p.pricing?.finalPrice ?? getBasePrice(p);
}

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const CATEGORIES = ['All', 'Shake', 'Tea', 'Bar', 'Suplemen', 'Program'];

export default function ProductsPage({ user }: ProductsPageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addToCart, isInCart, isLoading: cartLoading } = useCart();

  const fetchProducts = () => {
    setLoading(true);
    setError('');
    productsApi.list({ category: category === 'All' ? undefined : category }).then(res => {
      if (res.success && res.data) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
      setLoaded(true);
    }).catch(() => {
      setError('Gagal memuat produk. Silakan coba lagi.');
      setProducts([]);
      setLoaded(true);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => { fetchProducts(); }, [category]);

  const filtered = products.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (product: Product) => {
    const final = getEffectivePrice(product);
    addToCart({ id: product.id, name: product.name, price: final });
    setAddedIds(prev => new Set([...prev, product.id]));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(product.id); return n; }), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
        <div>
          <div className="text-emerald-700 text-sm tracking-[3px] font-medium">NC MULIA OFFICIAL STORE</div>
          <h1 className="text-6xl font-semibold tracking-[-2.5px] mt-1">Herbalife Shop</h1>
          <p className="text-slate-600 mt-2">Informasi produk Herbalife , terus 100% Original</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-emerald-600">{filtered.length} Produk</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-20 z-40 bg-white py-4 border-b">
        <input
          type="text"
          placeholder="Cari produk Herbalife..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 focus:border-emerald-500 px-5 py-3 rounded-2xl text-sm focus:outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-3 text-sm rounded-2xl border transition-all ${category === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading || !loaded ? (
        <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={fetchProducts} className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors">Coba Lagi</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Produk belum tersedia.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => {
            const inCart = isInCart(product.id);
            const justAdded = addedIds.has(product.id);
            const pricing = product.pricing ?? { discountPercentage: 0, discountAmount: 0, finalPrice: getBasePrice(product), membershipApplied: false };
            const hasDiscount = pricing.membershipApplied && pricing.discountPercentage > 0;
            const basePrice = getBasePrice(product);
            const finalPrice = pricing.finalPrice;
            return (
              <div key={product.id} className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow border border-slate-200/80">
                <div className="relative">
                  {product.imageUrl ? (
                    <div className="w-full h-60 bg-[#F5FAF7] flex items-center justify-center overflow-hidden border-b border-slate-200 shadow-sm">
                      <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-60 bg-emerald-50 flex items-center justify-center">
                      <span className="text-5xl font-bold text-emerald-200">{product.name[0]}</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white px-3 py-1 text-xs font-semibold tracking-wider rounded-full shadow">
                    {product.category}
                  </div>
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-full">
                      -{pricing.discountPercentage}%
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="font-semibold tracking-tight text-lg leading-tight mb-1">{product.name}</div>
                  {hasDiscount ? (
                    <div className="mb-1">
                      <span className="text-slate-400 line-through text-sm">{formatPrice(basePrice)}</span>
                      <div className="text-red-500 text-xs font-medium mt-0.5">Diskon Member {pricing.discountPercentage}%</div>
                    </div>
                  ) : null}
                  <div className="text-emerald-700 text-2xl font-semibold mb-3">{formatPrice(finalPrice)}</div>
                  <p className="text-sm text-slate-600 mb-6 flex-1">{product.description}</p>

                  {inCart ? (
                    <div className="w-full bg-emerald-100 text-emerald-700 py-3.5 rounded-2xl text-sm font-medium text-center flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Sudah di Keranjang
                    </div>
                  ) : justAdded ? (
                    <div className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl text-sm font-medium text-center">Ditambahkan!</div>
                  ) : !product.isAvailable ? (
                    <div className="w-full bg-slate-100 text-slate-400 py-3.5 rounded-2xl text-sm font-medium text-center cursor-not-allowed">Tidak Tersedia</div>
                  ) : (
                    <button
                      onClick={() => handleAdd(product)}
                      disabled={cartLoading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white py-3.5 rounded-2xl text-sm font-medium transition-all"
                    >
                      + Tambah ke Keranjang
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-14 text-center text-xs text-slate-500 tracking-widest">Semua produk Herbalife dijamin ORIGINAL</div>
    </div>
  );
}
