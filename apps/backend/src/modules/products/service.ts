import { prisma } from '../../lib/db.js';
import { getMemberDiscountRate } from '../pricing/index.js';

function isMemberActive(user: { membershipStatus: string; membershipExpiresAt: Date | null; isActive: boolean } | null) {
  if (!user || !user.isActive) return false;
  return user.membershipStatus === 'MEMBER' && (!user.membershipExpiresAt || user.membershipExpiresAt > new Date());
}

function applyPricing(product: any, isMember: boolean, discountRate: number) {
  const price = typeof product.price === 'number' ? product.price : Number(product.price);
  const discountPercentage = isMember && product.isMemberDiscountEligible ? discountRate * 100 : 0;
  const discountAmount = Math.round(price * discountPercentage / 100);
  const finalPrice = price - discountAmount;
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    benefits: product.benefits,
    imageUrl: product.imageUrl,
    basePrice: price,
    stock: product.stock,
    isAvailable: product.isAvailable && product.stock > 0,
    isMemberDiscountEligible: product.isMemberDiscountEligible,
    isActive: product.isActive,
    pricing: {
      discountPercentage,
      discountAmount,
      finalPrice,
      membershipApplied: discountPercentage > 0,
    },
  };
}

export class ProductsService {
  async findAll(query: { category?: string; search?: string; includeInactive?: boolean }, userId?: string) {
    const where: Record<string, unknown> = {};
    if (!query.includeInactive) where.isActive = true;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    let isMember = false;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { membershipStatus: true, membershipExpiresAt: true, isActive: true } });
      isMember = isMemberActive(user);
    }
    const discountRate = await getMemberDiscountRate();
    return products.map(p => applyPricing(p, isMember, discountRate));
  }

  async findById(id: string, userId?: string) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) { const err: any = new Error('Produk tidak ditemukan.'); err.statusCode = 404; throw err; }
    let isMember = false;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { membershipStatus: true, membershipExpiresAt: true, isActive: true } });
      isMember = isMemberActive(user);
    }
    const discountRate = await getMemberDiscountRate();
    return applyPricing(p, isMember, discountRate);
  }

  async create(data: { name: string; category: string; description?: string; benefits?: string; price: number; imageUrl?: string; stock?: number }) {
    const p = await prisma.product.create({
      data: { name: data.name, category: data.category, description: data.description ?? '', benefits: data.benefits, price: data.price, imageUrl: data.imageUrl, stock: data.stock ?? 0, isAvailable: true, isMemberDiscountEligible: true, isActive: true },
    });
    const priceNum = typeof p.price === 'number' ? p.price : Number(p.price);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      benefits: p.benefits,
      basePrice: priceNum,
      stock: p.stock,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      isMemberDiscountEligible: p.isMemberDiscountEligible,
      isActive: p.isActive,
      pricing: { discountPercentage: 0, discountAmount: 0, finalPrice: priceNum, membershipApplied: false },
    };
  }

  async update(id: string, data: Partial<{ name: string; category: string; description: string; benefits: string; price: number; imageUrl: string; stock: number; isAvailable: boolean; isMemberDiscountEligible: boolean }>) {
    const p = await prisma.product.update({ where: { id }, data });
    const priceNum = typeof p.price === 'number' ? p.price : Number(p.price);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      benefits: p.benefits,
      basePrice: priceNum,
      stock: p.stock,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      isMemberDiscountEligible: p.isMemberDiscountEligible,
      isActive: p.isActive,
      pricing: { discountPercentage: 0, discountAmount: 0, finalPrice: priceNum, membershipApplied: false },
    };
  }

  async remove(id: string) {
    const p = await prisma.product.update({ where: { id }, data: { isActive: false } });
    return { id: p.id, isActive: p.isActive };
  }
}
