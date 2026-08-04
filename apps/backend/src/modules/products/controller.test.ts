import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const VALID_CATEGORIES = ['Shake', 'Tea', 'Bar', 'Suplemen', 'Program'];

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).refine(v => VALID_CATEGORIES.includes(v), { message: `Kategori harus salah satu dari: ${VALID_CATEGORIES.join(', ')}` }),
  description: z.string().optional(),
  benefits: z.string().optional(),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  stock: z.number().int().min(0, 'Stok tidak boleh negatif').optional(),
  imageUrl: z.string().optional(),
});

const updateSchema = createSchema.partial();

describe('Product validation schemas', () => {
  describe('createSchema', () => {
    it('accepts valid product data', () => {
      const result = createSchema.safeParse({ name: 'F1 Shake', category: 'Shake', price: 100000, stock: 50 });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createSchema.safeParse({ name: '', category: 'Shake', price: 100000 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
      }
    });

    it('rejects invalid category', () => {
      const result = createSchema.safeParse({ name: 'Test', category: 'InvalidCat', price: 100000 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('category'))).toBe(true);
      }
    });

    it('accepts all valid categories', () => {
      for (const cat of VALID_CATEGORIES) {
        const result = createSchema.safeParse({ name: 'Test', category: cat, price: 100000 });
        expect(result.success).toBe(true);
      }
    });

    it('rejects negative price', () => {
      const result = createSchema.safeParse({ name: 'Test', category: 'Shake', price: -100 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('price'))).toBe(true);
      }
    });

    it('accepts zero price (free product)', () => {
      const result = createSchema.safeParse({ name: 'Free Sample', category: 'Shake', price: 0 });
      expect(result.success).toBe(true);
    });

    it('rejects negative stock', () => {
      const result = createSchema.safeParse({ name: 'Test', category: 'Shake', price: 100000, stock: -5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('stock'))).toBe(true);
      }
    });

    it('accepts zero stock', () => {
      const result = createSchema.safeParse({ name: 'Test', category: 'Shake', price: 100000, stock: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts optional fields', () => {
      const result = createSchema.safeParse({ name: 'F1 Shake', category: 'Shake', price: 100000, description: 'Great shake', benefits: 'Nutrition', imageUrl: 'https://example.com/img.jpg', stock: 25 });
      expect(result.success).toBe(true);
    });
  });

  describe('updateSchema (partial of createSchema)', () => {
    it('accepts empty object (no updates)', () => {
      const result = updateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts partial updates — stock only', () => {
      const result = updateSchema.safeParse({ stock: 99 });
      expect(result.success).toBe(true);
    });

    it('accepts partial updates — price only', () => {
      const result = updateSchema.safeParse({ price: 200000 });
      expect(result.success).toBe(true);
    });

    it('accepts partial updates — category only', () => {
      const result = updateSchema.safeParse({ category: 'Tea' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid category on partial update', () => {
      const result = updateSchema.safeParse({ category: 'RogueCategory' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('category'))).toBe(true);
      }
    });

    it('rejects negative price on partial update', () => {
      const result = updateSchema.safeParse({ price: -50 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('price'))).toBe(true);
      }
    });

    it('rejects negative stock on partial update', () => {
      const result = updateSchema.safeParse({ stock: -10 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('stock'))).toBe(true);
      }
    });
  });
});
