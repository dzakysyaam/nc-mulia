import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calculator, Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { calculateBmi } from '../lib/bmi';
import { getRecommendation } from '../lib/recommendations';
import { formatPrice } from '../lib/formatters';
import { getProductImage } from '../lib/productImages';
import { herbalifeProducts } from '../data/herbalife-products';
import { bmiApi } from '../lib/api';
import type { User, BmiCategory } from '../types';

interface BmiPageProps {
  user: User | null;
}

const categoryConfig: Record<BmiCategory, { color: string; bg: string; border: string; label: string }> = {
  'Kurus': { color: 'text-warning', bg: 'bg-warning-soft', border: 'border-warning/20', label: 'Kurus (< 18.5)' },
  'Normal': { color: 'text-success', bg: 'bg-success-soft', border: 'border-success/20', label: 'Normal (18.5 - 24.9)' },
  'Kelebihan Berat': { color: 'text-brand-accent', bg: 'bg-brand-accent-soft', border: 'border-brand-accent/20', label: 'Kelebihan Berat (25 - 29.9)' },
  'Obesitas': { color: 'text-danger', bg: 'bg-danger-soft', border: 'border-danger/20', label: 'Obesitas (≥ 30)' },
};

export default function BmiPage({ user }: BmiPageProps) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<{ value: number; category: BmiCategory; description: string } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCalculate = async () => {
    setError('');
    setResult(null);
    setSaved(false);

    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (isNaN(h) || isNaN(w)) {
      setError('Pastikan tinggi dan berat badan diisi dengan angka yang valid.');
      return;
    }
    if (h <= 0 || w <= 0) {
      setError('Tinggi dan berat badan harus bernilai positif.');
      return;
    }
    if (h > 250 || w > 500) {
      setError('Periksa kembali nilai yang dimasukkan.');
      return;
    }

    setIsLoading(true);
    try {
      const bmiResult = calculateBmi(w, h);
      setResult(bmiResult);

      if (user) {
        await bmiApi.calculate({ heightCm: h, weightKg: w });
        setSaved(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const recommendedProducts = result
    ? herbalifeProducts.filter(p => getRecommendation(result.category).productIds.includes(p.id))
    : [];

  const catCfg = result ? categoryConfig[result.category] : null;

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary-soft flex items-center justify-center text-brand-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Hitung BMI</h1>
            </div>
          </div>
          <p className="text-foreground-muted leading-relaxed max-w-xl">
            Masukkan tinggi dan berat badan untuk mengetahui kategori BMI Anda. Hasil ini bisa membantu menentukan produk Herbalife yang tepat.
          </p>
        </div>

        <Card className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-5">Data Tubuh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tinggi Badan (cm)"
              type="number"
              placeholder="Contoh: 170"
              value={height}
              onChange={e => setHeight(e.target.value)}
              min={1}
              max={250}
            />
            <Input
              label="Berat Badan (kg)"
              type="number"
              placeholder="Contoh: 65"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              min={1}
              max={500}
            />
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-danger-soft border border-danger/20 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mt-5">
            <Button
              onClick={handleCalculate}
              disabled={isLoading || !height || !weight}
              loading={isLoading}
              icon={<Calculator className="w-4 h-4" />}
              className="w-full"
              size="lg"
            >
              Hitung Sekarang
            </Button>
          </div>
        </Card>

        {/* Result */}
        {result && catCfg && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className={`${catCfg.bg} border ${catCfg.border} mb-6`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className={`text-6xl font-bold ${catCfg.color} tracking-tight`}>{result.value}</div>
                  <Badge
                    variant={
                      result.category === 'Normal' ? 'success' :
                      result.category === 'Kurus' ? 'warning' :
                      result.category === 'Kelebihan Berat' ? 'warning' : 'danger'
                    }
                    className="mt-2"
                  >
                    {result.category}
                  </Badge>
                </div>
                <div className="text-right">
                  {saved && (
                    <div className="flex items-center gap-1.5 text-sm text-success mb-1">
                      <CheckCircle className="w-4 h-4" /> Tersimpan
                    </div>
                  )}
                  <div className="text-xs text-foreground-muted">BMI Index</div>
                </div>
              </div>

              <p className="text-sm text-foreground-muted leading-relaxed mb-1">{result.description}</p>
              <p className="text-xs text-foreground-subtle">
                {catCfg.label} — untuk dewasa usia 20 tahun ke atas.
              </p>
            </Card>

            {/* Recommendations */}
            <Card>
              <h3 className="text-base font-semibold text-foreground mb-1">Rekomendasi Produk</h3>
              <p className="text-xs text-foreground-muted mb-4">
                Produk Herbalife yang cocok untuk kategori <strong>{result.category}</strong>. {getRecommendation(result.category).disclaimer}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {recommendedProducts.slice(0, 4).map(product => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl border border-border">
                    <img
                      src={getProductImage(product.name)}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{product.name}</div>
                      <div className="text-xs text-brand-primary font-semibold">{formatPrice(product.basePrice!)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/produk-herbalife">
                <Button variant="secondary" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" className="w-full justify-center">
                  Lihat Semua Produk
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}

        {/* Category Reference */}
        <Card className="mt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-primary" />
            Referensi Kategori BMI
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(categoryConfig) as [BmiCategory, typeof categoryConfig[BmiCategory]][]).map(([cat, cfg]) => (
              <div key={cat} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} text-center`}>
                <div className={`text-sm font-semibold ${cfg.color} mb-0.5`}>{cat}</div>
                <div className="text-[11px] text-foreground-subtle">
                  {cat === 'Kurus' && '< 18.5'}
                  {cat === 'Normal' && '18.5 - 24.9'}
                  {cat === 'Kelebihan Berat' && '25 - 29.9'}
                  {cat === 'Obesitas' && '≥ 30'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
