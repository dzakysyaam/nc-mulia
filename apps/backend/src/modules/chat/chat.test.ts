import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './service.js';

// ── Mock Prisma — vi.fn() calls MUST be inside factory (hoisting) ──────────────
vi.mock('../../lib/db.js', () => {
  return {
    prisma: {
      chatConversation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      chatMessage: {
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

// ── Access mock AFTER vi.mock ───────────────────────────────────────────────
import { prisma } from '../../lib/db.js';

// ── Helper factories ────────────────────────────────────────────────────────
const mkConv = (overrides: Record<string, unknown> = {}) => ({
  id: 'conv-1',
  userId: 'user-123',
  customerName: 'Test User',
  category: 'SERVICE',
  status: 'OPEN',
  unreadByAdmin: 1,
  unreadByUser: 0,
  lastMessageAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

const mkMsg = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-123',
  senderRole: 'USER',
  message: 'Hello',
  readAt: null,
  createdAt: new Date(),
  sender: { id: 'user-123', name: 'Test User' },
  ...overrides,
});

// ── Service instance ────────────────────────────────────────────────────────
const service = new ChatService();

// ─────────────────────────────────────────────────────────────────────────────
// sendMessage — authorization
// ─────────────────────────────────────────────────────────────────────────────
describe('ChatService.sendMessage authorization', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: conversation owned by user-123
    prisma.chatConversation.findUnique.mockResolvedValue(mkConv({ userId: 'user-123' }));
    // Return whatever data was passed to create()
    prisma.chatMessage.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'msg-new',
        conversationId: args.data.conversationId as string,
        senderId: args.data.senderId as string,
        senderRole: args.data.senderRole,
        message: args.data.message as string,
        readAt: null,
        createdAt: new Date(),
      })
    );
    prisma.chatConversation.update.mockResolvedValue(mkConv());
  });

  it('USER reads own conversation — passes ownership check, returns messages', async () => {
    prisma.chatMessage.findMany.mockResolvedValue([mkMsg()]);
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.getMessages('conv-1', 'user-123', false);
    expect(result).toHaveLength(1);
    expect(prisma.chatMessage.findMany).toHaveBeenCalled();
  });

  it('USER tries to read another user\'s conversation — 403', async () => {
    await expect(service.getMessages('conv-1', 'hacker-456', false))
      .rejects.toMatchObject({ statusCode: 403, message: 'Tidak diizinkan.' });
  });

  it('ADMIN reads user conversation — bypasses ownership check, returns 200', async () => {
    prisma.chatMessage.findMany.mockResolvedValue([mkMsg()]);
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.getMessages('conv-1', 'admin-999', true);
    expect(result).toHaveLength(1);
    expect(prisma.chatMessage.findMany).toHaveBeenCalled();
  });

  it('SUPER_ADMIN reads user conversation — bypasses ownership check, returns 200', async () => {
    prisma.chatMessage.findMany.mockResolvedValue([mkMsg()]);
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.getMessages('conv-1', 'super-admin-999', true);
    expect(result).toHaveLength(1);
  });

  it('ADMIN sends reply to user conversation — succeeds', async () => {
    const result = await service.sendMessage('conv-1', 'admin-999', 'ADMIN', 'Hello from admin');
    expect(result.message).toBe('Hello from admin');
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-1',
        senderId: 'admin-999',
        senderRole: 'ADMIN',
        message: 'Hello from admin',
      }),
    });
  });

  it('SUPER_ADMIN sends reply to user conversation — succeeds', async () => {
    const result = await service.sendMessage('conv-1', 'super-admin-999', 'ADMIN', 'Reply from super admin');
    expect(result.message).toBe('Reply from super admin');
  });

  it('USER sends message to own conversation — succeeds', async () => {
    const result = await service.sendMessage('conv-1', 'user-123', 'USER', 'My message');
    expect(result.message).toBe('My message');
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ senderRole: 'USER' }),
    });
  });

  it('USER tries to send message to another user\'s conversation — 403', async () => {
    await expect(service.sendMessage('conv-1', 'hacker-456', 'USER', 'Unauthorized message'))
      .rejects.toMatchObject({ statusCode: 403, message: 'Tidak diizinkan.' });
  });

  it('ADMIN markRead on user conversation — succeeds', async () => {
    prisma.chatMessage.updateMany.mockResolvedValue({ count: 1 });
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.markRead('conv-1', 'admin-999', true);
    expect(result).toEqual({ success: true });
    expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1', senderRole: 'USER', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('SUPER_ADMIN markRead on user conversation — succeeds', async () => {
    prisma.chatMessage.updateMany.mockResolvedValue({ count: 1 });
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.markRead('conv-1', 'super-admin-999', true);
    expect(result).toEqual({ success: true });
  });

  it('USER markRead own conversation — succeeds', async () => {
    prisma.chatMessage.updateMany.mockResolvedValue({ count: 1 });
    prisma.chatConversation.update.mockResolvedValue(mkConv());

    const result = await service.markRead('conv-1', 'user-123', false);
    expect(result).toEqual({ success: true });
  });

  it('USER markRead another user\'s conversation — 403', async () => {
    await expect(service.markRead('conv-1', 'hacker-456', false))
      .rejects.toMatchObject({ statusCode: 403, message: 'Tidak diizinkan.' });
  });

  it('Conversation not found — 404 for getMessages', async () => {
    prisma.chatConversation.findUnique.mockResolvedValue(null);
    await expect(service.getMessages('nonexistent', 'user-123', false))
      .rejects.toMatchObject({ statusCode: 404, message: 'Percakapan tidak ditemukan.' });
  });

  it('Conversation not found — 404 for sendMessage', async () => {
    prisma.chatConversation.findUnique.mockResolvedValue(null);
    await expect(service.sendMessage('nonexistent', 'user-123', 'USER', 'test'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Percakapan tidak ditemukan.' });
  });

  it('Conversation not found — 404 for markRead', async () => {
    prisma.chatConversation.findUnique.mockResolvedValue(null);
    await expect(service.markRead('nonexistent', 'user-123', false))
      .rejects.toMatchObject({ statusCode: 404, message: 'Percakapan tidak ditemukan.' });
  });
});
