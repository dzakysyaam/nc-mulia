import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChatService } from './service.js';
import { getIO } from '../../socket/index.js';
import { parseErrors } from '../../middleware/error.js';

const service = new ChatService();

const createConvSchema = z.object({ customerName: z.string().min(1), category: z.enum(['service', 'complaint']) });
const sendMsgSchema = z.object({ message: z.string().min(1) });
const querySchema = z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional(), status: z.string().optional(), category: z.string().optional() });

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createConvSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Data tidak valid.', errors: parseErrors(parsed.error) }); return; }
    const conv = await service.createConversation(req.user!.userId, parsed.data.customerName, parsed.data.category.toUpperCase() as 'SERVICE' | 'COMPLAINT');
    res.status(201).json({ success: true, message: 'Percakapan dibuat.', data: conv });
  } catch (e) { next(e); }
}

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const convs = await service.listByUser(req.user!.userId);
    res.json({ success: true, message: 'OK.', data: convs });
  } catch (e) { next(e); }
}

export async function listAllConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.safeParse(req.query);
    const result = await service.listAll(parsed.success ? parsed.data : {});
    res.json({ success: true, message: 'OK.', data: result });
  } catch (e) { next(e); }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const messages = await service.getMessages(req.params.id as string, req.user!.userId, isAdmin);
    res.json({ success: true, message: 'OK.', data: messages });
  } catch (e) { next(e); }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = sendMsgSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Data tidak valid.', errors: parseErrors(parsed.error) }); return; }
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const convId = req.params.id as string;
    const result = await service.sendMessage(convId, req.user!.userId, isAdmin ? 'ADMIN' : 'USER', parsed.data.message);
    try { const io = getIO(); io.to(`chat:${convId}`).emit('message:new', { conversationId: convId, ...result }); } catch {}
    res.status(201).json({ success: true, message: 'Pesan terkirim.', data: result });
  } catch (e) { next(e); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const result = await service.markRead(req.params.id as string, req.user!.userId, isAdmin);
    res.json({ success: true, message: 'OK.', data: result });
  } catch (e) { next(e); }
}

export async function closeConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.closeConversation(req.params.id as string);
    res.json({ success: true, message: 'Percakapan ditutup.', data: result });
  } catch (e) { next(e); }
}
