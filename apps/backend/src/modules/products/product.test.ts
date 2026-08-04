import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const m: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  m.user = { findUnique: vi.fn() };
  m.product = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  return { mockPrisma: m };
});

vi.mock('../../lib/db.js', () => ({ prisma: mockPrisma }));

vi.mock('../../modules/pricing/index.js', () => ({
  getMemberDiscountRate: vi.fn().mockResolvedValue(0.30),
  clearDiscountCache: vi.fn(),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test', PORT: '3000', FRONTEND_URL: 'http://localhost:5173',
    DATABASE_URL: 'mysql://test:test@localhost:3306/test',
    JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars-long',
    JWT_EXPIRES_IN: '7d', PAYMENT_SIMULATION_ENABLED: 'false',
  },
}));

import { ProductsService } from './service.js';

const stdProduct = { id: 'p1', name: 'F1 Shake', category: 'Nutrition', description: '', benefits: '', price: 100000, imageUrl: null, stock: 50, isAvailable: true, isMemberDiscountEligible: true, isActive: true };

describe('ProductsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('findAll', () => {
    it('returns all active products by default', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct }, { ...stdProduct, id: 'p2', name: 'Amino', price: 50000, stock: 30 }]);
      const svc = new ProductsService();
      const result = await svc.findAll({});
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
      expect(result).toHaveLength(2);
      expect(result[0].pricing.finalPrice).toBe(100000);
      expect(result[0].pricing.discountPercentage).toBe(0);
    });

    it('applies 30% membership discount for logged-in MEMBER users', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct }]);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', membershipStatus: 'MEMBER', membershipExpiresAt: new Date(Date.now() + 86400000), isActive: true });
      const svc = new ProductsService();
      const result = await svc.findAll({}, 'u1');
      expect(result[0].pricing.discountPercentage).toBe(30);
      expect(result[0].pricing.discountAmount).toBe(30000);
      expect(result[0].pricing.finalPrice).toBe(70000);
      expect(result[0].pricing.membershipApplied).toBe(true);
    });

    it('returns regular prices for REGULAR user (not a member)', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct }]);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', membershipStatus: 'REGULAR', membershipExpiresAt: null, isActive: true });
      const svc = new ProductsService();
      const result = await svc.findAll({}, 'u1');
      expect(result[0].pricing.discountPercentage).toBe(0);
      expect(result[0].pricing.finalPrice).toBe(100000);
      expect(result[0].pricing.membershipApplied).toBe(false);
    });

    it('filters by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const svc = new ProductsService();
      await svc.findAll({ category: 'Nutrition' });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ category: 'Nutrition', isActive: true }) }));
    });

    it('filters by search term (name or description)', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const svc = new ProductsService();
      await svc.findAll({ search: 'shake' });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isActive: true, OR: [{ name: { contains: 'shake', mode: 'insensitive' } }, { description: { contains: 'shake', mode: 'insensitive' } }] }) }));
    });

    it('combines category and search filters', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const svc = new ProductsService();
      await svc.findAll({ category: 'Nutrition', search: 'f1' });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isActive: true, category: 'Nutrition', OR: [{ name: { contains: 'f1', mode: 'insensitive' } }, { description: { contains: 'f1', mode: 'insensitive' } }] }) }));
    });

    it('includes inactive products when includeInactive=true', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const svc = new ProductsService();
      await svc.findAll({ includeInactive: true });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.not.objectContaining({ isActive: true }) }));
    });
  });

  describe('findById', () => {
    it('returns product by id', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...stdProduct, description: 'Healthy shake' });
      const svc = new ProductsService();
      const result = await svc.findById('p1');
      expect(result.id).toBe('p1');
      expect(result.name).toBe('F1 Shake');
    });

    it('applies discount for MEMBER user', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...stdProduct });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', membershipStatus: 'MEMBER', membershipExpiresAt: new Date(Date.now() + 86400000), isActive: true });
      const svc = new ProductsService();
      const result = await svc.findById('p1', 'u1');
      expect(result.pricing.discountPercentage).toBe(30);
      expect(result.pricing.finalPrice).toBe(70000);
    });

    it('returns 404 when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const svc = new ProductsService();
      await expect(svc.findById('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('create', () => {
    it('creates product with stock field included', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new', name: 'New Shake', category: 'Nutrition', description: 'New product', benefits: '', price: 150000, imageUrl: null, stock: 25, isAvailable: true, isMemberDiscountEligible: true, isActive: true });
      const svc = new ProductsService();
      const result = await svc.create({ name: 'New Shake', category: 'Nutrition', description: 'New product', price: 150000, stock: 25 });
      expect(result.stock).toBe(25);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'New Shake', stock: 25 }) });
    });

    it('defaults stock to 0 when not provided', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new', name: 'New Shake', category: 'Nutrition', description: '', benefits: '', price: 150000, imageUrl: null, stock: 0, isAvailable: true, isMemberDiscountEligible: true, isActive: true });
      const svc = new ProductsService();
      await svc.create({ name: 'New Shake', category: 'Nutrition', price: 150000 });
      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ stock: 0 }) });
    });

    it('returns product with initial pricing (no discount)', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new', name: 'New Shake', category: 'Nutrition', description: '', benefits: '', price: 150000, imageUrl: null, stock: 0, isAvailable: true, isMemberDiscountEligible: true, isActive: true });
      const svc = new ProductsService();
      const result = await svc.create({ name: 'New Shake', category: 'Nutrition', price: 150000 });
      expect(result.pricing).toEqual({ discountPercentage: 0, discountAmount: 0, finalPrice: 150000, membershipApplied: false });
    });
  });

  describe('update', () => {
    it('can update stock', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', name: 'F1 Shake', category: 'Nutrition', description: '', benefits: '', price: 100000, imageUrl: null, stock: 40, isAvailable: true, isMemberDiscountEligible: true, isActive: true });
      const svc = new ProductsService();
      const result = await svc.update('p1', { stock: 40 });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: 40 } });
      expect(result.stock).toBe(40);
    });

    it('can update price and other fields', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', name: 'F1 Shake Pro', category: 'Premium', description: 'Updated', benefits: '', price: 200000, imageUrl: null, stock: 10, isAvailable: true, isMemberDiscountEligible: false, isActive: true });
      const svc = new ProductsService();
      const result = await svc.update('p1', { name: 'F1 Shake Pro', price: 200000, category: 'Premium', isMemberDiscountEligible: false });
      expect(result.basePrice).toBe(200000);
      expect(result.name).toBe('F1 Shake Pro');
    });
  });

  describe('remove', () => {
    it('soft-deletes product by setting isActive=false', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', isActive: false });
      const svc = new ProductsService();
      const result = await svc.remove('p1');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false } });
      expect(result.id).toBe('p1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('isAvailable = false when stock = 0', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct, id: 'p1', name: 'Out of Stock', stock: 0 }]);
      const svc = new ProductsService();
      const result = await svc.findAll({});
      expect(result[0].isAvailable).toBe(false);
    });

    it('isAvailable = true when stock > 0', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct, id: 'p1', name: 'In Stock', stock: 10 }]);
      const svc = new ProductsService();
      const result = await svc.findAll({});
      expect(result[0].isAvailable).toBe(true);
    });

    it('isAvailable = false even when product.isAvailable=true if stock=0', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ ...stdProduct, id: 'p1', stock: 0 }]);
      const svc = new ProductsService();
      const result = await svc.findAll({});
      expect(result[0].isAvailable).toBe(false);
    });
  });
});
