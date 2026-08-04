import { prisma } from '../../lib/db.js';

// ── Single source of truth for BMI calculation & mapping ───────────────────
// All category labels match frontend exactly. Enum values match database.

const CATEGORIES = [
  { min: 0,      max: 18.5,         dbValue: 'KURUS'          as const, label: 'Kurus' },
  { min: 18.5,   max: 25,           dbValue: 'NORMAL'        as const, label: 'Normal' },
  { min: 25,     max: 30,           dbValue: 'KELebihan_BERAT' as const, label: 'Kelebihan Berat' },
  { min: 30,     max: Infinity,     dbValue: 'OBESITAS'       as const, label: 'Obesitas' },
];

// ── Centrally used throughout the module ─────────────────────────────────────
// formatLabel: DB enum → display label (Indonesian)
const formatLabel = (dbValue: string) => CATEGORIES.find(c => c.dbValue === dbValue)?.label ?? dbValue;

export class BmiService {
  calculate(weightKg: number, heightCm: number) {
    const value = Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
    const cat = CATEGORIES.find(c => value >= c.min && value < c.max) ?? CATEGORIES[CATEGORIES.length - 1];
    return { value, category: cat.label, dbCategory: cat.dbValue };
  }

  async createRecord(userId: string, weightKg: number, heightCm: number) {
    const { value, dbCategory } = this.calculate(weightKg, heightCm);
    const record = await prisma.bmiRecord.create({
      data: { userId, weight: weightKg, height: heightCm, bmi: value, bmiCategory: dbCategory },
    });
    return { id: record.id, weightKg: Number(record.weight), heightCm: Number(record.height), bmiValue: Number(record.bmi), bmiCategory: formatLabel(record.bmiCategory), createdAt: record.createdAt.toISOString() };
  }

  async getHistory(userId: string) {
    const records = await prisma.bmiRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return records.map(r => ({ id: r.id, weightKg: Number(r.weight), heightCm: Number(r.height), bmiValue: Number(r.bmi), bmiCategory: formatLabel(r.bmiCategory), createdAt: r.createdAt.toISOString() }));
  }

  async getAll(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where = query.search ? { user: { name: { contains: query.search, mode: 'insensitive' } } } : {};
    const [records, total] = await Promise.all([
      prisma.bmiRecord.findMany({ where, include: { user: { select: { name: true, email: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.bmiRecord.count({ where }),
    ]);
    return {
      records: records.map(r => ({ id: r.id, user: { name: r.user?.name, email: r.user?.email }, weightKg: Number(r.weight), heightCm: Number(r.height), bmiValue: Number(r.bmi), bmiCategory: formatLabel(r.bmiCategory), createdAt: r.createdAt.toISOString() })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
