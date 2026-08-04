import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductsService } from './service.js';
import { parseErrors } from '../../middleware/error.js';
import { createAuditLog } from '../audit/service.js';
import { getClientIp, getUserAgent } from '../../lib/audit.js';

const service = new ProductsService();

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

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

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.safeParse(req.query);
    const data = parsed.success ? parsed.data : {};
    const userId = req.user?.userId;
    const products = await service.findAll(data, userId);
    res.json({ success: true, message: 'OK.', data: products });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const product = await service.findById(req.params.id as string, userId);
    res.json({ success: true, message: 'OK.', data: product });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Data tidak valid.', errors: parseErrors(parsed.error) });
      return;
    }
    const product = await service.create(parsed.data);
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'create',
      module: 'products',
      entityType: 'product',
      entityId: product.id,
      afterData: product,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.status(201).json({ success: true, message: 'Produk berhasil dibuat.', data: product });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Data tidak valid.', errors: parseErrors(parsed.error) });
      return;
    }
    const existing = await service.findById(req.params.id as string);
    const product = await service.update(req.params.id as string, parsed.data);
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'update',
      module: 'products',
      entityType: 'product',
      entityId: product.id,
      beforeData: existing,
      afterData: product,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true, message: 'Produk berhasil diperbarui.', data: product });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await service.findById(req.params.id as string);
    const result = await service.remove(req.params.id as string);
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'delete',
      module: 'products',
      entityType: 'product',
      entityId: req.params.id as string,
      beforeData: existing,
      afterData: result,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true, message: 'Produk berhasil dihapus.', data: result });
  } catch (e) {
    next(e);
  }
}
