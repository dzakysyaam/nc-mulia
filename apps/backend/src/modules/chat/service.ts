import { prisma } from '../../lib/db.js';

function err(status: number, msg: string) {
  const e = Object.assign(new Error(msg), { statusCode: status });
  return e;
}

export class ChatService {
  async createConversation(userId: string, customerName: string, category: 'SERVICE' | 'COMPLAINT') {
    const conv = await prisma.chatConversation.create({ data: { userId, customerName, category } });
    return { id: conv.id, customerName: conv.customerName, category: conv.category.toLowerCase(), status: conv.status.toLowerCase().replace('_', ' '), lastMessageAt: conv.lastMessageAt.toISOString(), createdAt: conv.createdAt.toISOString() };
  }

  async listByUser(userId: string) {
    const convs = await prisma.chatConversation.findMany({ where: { userId }, orderBy: { lastMessageAt: 'desc' } });
    return convs.map(c => ({ id: c.id, customerName: c.customerName, category: c.category.toLowerCase(), status: c.status.toLowerCase().replace('_', ' '), unreadCount: c.unreadByUser, lastMessageAt: c.lastMessageAt.toISOString(), createdAt: c.createdAt.toISOString() }));
  }

  async listAll(query: { page?: number; limit?: number; status?: string; category?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status.toUpperCase();
    if (query.category) where.category = query.category.toUpperCase();

    const [convs, total] = await Promise.all([
      prisma.chatConversation.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.chatConversation.count({ where }),
    ]);

    return {
      conversations: convs.map(c => ({
        id: c.id,
        user: c.user ? { id: c.user.id, name: c.user.name, email: c.user.email } : undefined,
        customerName: c.customerName,
        category: c.category.toLowerCase(),
        status: c.status.toLowerCase().replace('_', ' '),
        unreadByAdmin: c.unreadByAdmin,
        lastMessageAt: c.lastMessageAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMessages(conversationId: string, userId: string, isAdmin: boolean) {
    const conv = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw err(404, 'Percakapan tidak ditemukan.');
    if (!isAdmin && conv.userId !== userId) throw err(403, 'Tidak diizinkan.');

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: isAdmin ? { unreadByAdmin: 0 } : { unreadByUser: 0 },
    });

    return messages.map(m => ({
      id: m.id,
      senderId: m.sender?.id,
      senderName: m.sender?.name,
      senderRole: m.senderRole.toLowerCase(),
      message: m.message,
      readAt: m.readAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async sendMessage(conversationId: string, senderId: string, senderRole: 'ADMIN' | 'USER', message: string) {
    const conv = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw err(404, 'Percakapan tidak ditemukan.');
    if (senderRole === 'USER' && conv.userId !== senderId) throw err(403, 'Tidak diizinkan.');

    const msg = await prisma.chatMessage.create({ data: { conversationId, senderId, senderRole, message } });

    const updateData: Record<string, unknown> = { lastMessageAt: new Date() };
    if (senderRole === 'ADMIN') {
      updateData.status = 'IN_PROGRESS';
      updateData.unreadByUser = { increment: 1 };
    } else {
      updateData.unreadByAdmin = { increment: 1 };
    }
    await prisma.chatConversation.update({ where: { id: conversationId }, data: updateData });

    return { id: msg.id, senderId: msg.senderId, senderRole: msg.senderRole.toLowerCase(), message: msg.message, createdAt: msg.createdAt.toISOString() };
  }

  async markRead(conversationId: string, userId: string, isAdmin: boolean) {
    const conv = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw err(404, 'Percakapan tidak ditemukan.');
    if (!isAdmin && conv.userId !== userId) throw err(403, 'Tidak diizinkan.');

    const senderFilter = isAdmin ? 'USER' : 'ADMIN';
    await prisma.chatMessage.updateMany({ where: { conversationId, senderRole: senderFilter, readAt: null }, data: { readAt: new Date() } });
    await prisma.chatConversation.update({ where: { id: conversationId }, data: isAdmin ? { unreadByAdmin: 0 } : { unreadByUser: 0 } });
    return { success: true };
  }

  async closeConversation(conversationId: string) {
    const conv = await prisma.chatConversation.update({ where: { id: conversationId }, data: { status: 'CLOSED' } });
    return { id: conv.id, status: conv.status.toLowerCase() };
  }
}
