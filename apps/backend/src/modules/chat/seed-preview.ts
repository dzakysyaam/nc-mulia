/**
 * POST /api/admin/seed-chat-preview
 *
 * Seeds chat fixture data on Preview environment.
 * Requires SEED_CHAT_API_KEY env var (set in Vercel Preview).
 * Idempotent: safe to call multiple times.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/db.js';
import { env } from '../../config/env.js';

const router = Router();

router.post('/seed-chat-preview', async (req, res) => {
  const apiKey = req.headers['x-seed-key'] as string;

  if (!env.SEED_CHAT_API_KEY || apiKey !== env.SEED_CHAT_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  try {
    // ── 1. Resolve roles ─────────────────────────────────────────────────────
    const superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });
    const userRole = await prisma.role.findUnique({ where: { slug: 'user' } });
    if (!superAdminRole || !userRole) {
      return res.status(500).json({ success: false, message: 'RBAC roles not seeded. Run seed.ts first.' });
    }

    const SUPER_ADMIN_EMAIL = process.env.SEED_CHAT_SUPER_ADMIN_EMAIL ?? 'superadmin@preview.local';
    const SUPER_ADMIN_PASSWORD = process.env.SEED_CHAT_SUPER_ADMIN_PASSWORD ?? 'PreviewAdmin123!';
    const USER_A_EMAIL = process.env.SEED_CHAT_USER_A_EMAIL ?? 'usera@preview.local';
    const USER_A_PASSWORD = process.env.SEED_CHAT_USER_A_PASSWORD ?? 'UserA123456!';
    const USER_B_EMAIL = process.env.SEED_CHAT_USER_B_EMAIL ?? 'userb@preview.local';
    const USER_B_PASSWORD = process.env.SEED_CHAT_USER_B_PASSWORD ?? 'UserB123456!';

    // ── 2. Create SUPER_ADMIN (upsert by ID — immune to email mismatch) ────────
    const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    const existingSuperAdmin = await prisma.user.findUnique({ where: { id: 'fixture_super_admin' } });
    let superAdmin: { id: string; email: string };
    if (existingSuperAdmin) {
      superAdmin = await prisma.user.update({
        where: { id: 'fixture_super_admin' },
        data: { email: SUPER_ADMIN_EMAIL.toLowerCase().trim(), name: 'Preview Super Admin', passwordHash: superAdminHash, isActive: true },
      });
    } else {
      superAdmin = await prisma.user.create({
        data: { id: 'fixture_super_admin', name: 'Preview Super Admin', email: SUPER_ADMIN_EMAIL.toLowerCase().trim(), passwordHash: superAdminHash, isActive: true, membershipStatus: 'REGULAR' },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: superAdmin.id, roleId: superAdminRole.id },
    });

    // ── 3. Create USER A (upsert by ID) ────────────────────────────────────────
    const userAHash = await bcrypt.hash(USER_A_PASSWORD, 10);
    const existingUserA = await prisma.user.findUnique({ where: { id: 'fixture_user_a' } });
    let userA: { id: string };
    if (existingUserA) {
      userA = await prisma.user.update({
        where: { id: 'fixture_user_a' },
        data: { email: USER_A_EMAIL.toLowerCase().trim(), name: 'Preview User A', passwordHash: userAHash, isActive: true },
      });
    } else {
      userA = await prisma.user.create({
        data: { id: 'fixture_user_a', name: 'Preview User A', email: USER_A_EMAIL.toLowerCase().trim(), passwordHash: userAHash, isActive: true, membershipStatus: 'REGULAR' },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userA.id, roleId: userRole.id } },
      update: {},
      create: { userId: userA.id, roleId: userRole.id },
    });

    // ── 4. Create USER B (upsert by ID) ────────────────────────────────────────
    const userBHash = await bcrypt.hash(USER_B_PASSWORD, 10);
    const existingUserB = await prisma.user.findUnique({ where: { id: 'fixture_user_b' } });
    let userB: { id: string };
    if (existingUserB) {
      userB = await prisma.user.update({
        where: { id: 'fixture_user_b' },
        data: { email: USER_B_EMAIL.toLowerCase().trim(), name: 'Preview User B', passwordHash: userBHash, isActive: true },
      });
    } else {
      userB = await prisma.user.create({
        data: { id: 'fixture_user_b', name: 'Preview User B', email: USER_B_EMAIL.toLowerCase().trim(), passwordHash: userBHash, isActive: true, membershipStatus: 'REGULAR' },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userB.id, roleId: userRole.id } },
      update: {},
      create: { userId: userB.id, roleId: userRole.id },
    });

    // ── 5. Create CONV_A ─────────────────────────────────────────────────────
    const convA = await prisma.chatConversation.upsert({
      where: { id: 'fixture_conv_user_a' },
      update: { userId: userA.id, customerName: 'Preview User A', category: 'SERVICE', status: 'OPEN' },
      create: { id: 'fixture_conv_user_a', userId: userA.id, customerName: 'Preview User A', category: 'SERVICE', status: 'OPEN' },
    });

    // ── 6. Create CONV_B ─────────────────────────────────────────────────────
    const convB = await prisma.chatConversation.upsert({
      where: { id: 'fixture_conv_user_b' },
      update: { userId: userB.id, customerName: 'Preview User B', category: 'SERVICE', status: 'OPEN' },
      create: { id: 'fixture_conv_user_b', userId: userB.id, customerName: 'Preview User B', category: 'SERVICE', status: 'OPEN' },
    });

    // ── 7. Seed messages in CONV_A ───────────────────────────────────────────
    await prisma.chatMessage.upsert({ where: { id: 'fixture_msg_a_1' }, update: {}, create: { id: 'fixture_msg_a_1', conversationId: convA.id, senderId: userA.id, senderRole: 'USER', message: 'Halo, saya ingin bertanya tentang produk Herbalife.' } });
    await prisma.chatMessage.upsert({ where: { id: 'fixture_msg_a_2' }, update: {}, create: { id: 'fixture_msg_a_2', conversationId: convA.id, senderId: userA.id, senderRole: 'USER', message: 'Apakah ada promo untuk paket nutrisi?' } });
    await prisma.chatMessage.upsert({ where: { id: 'fixture_msg_a_3' }, update: {}, create: { id: 'fixture_msg_a_3', conversationId: convA.id, senderId: superAdmin.id, senderRole: 'ADMIN', message: 'Terima kasih! Tim kami akan membantu.' } });

    // ── 8. Seed message in CONV_B ────────────────────────────────────────────
    await prisma.chatMessage.upsert({ where: { id: 'fixture_msg_b_1' }, update: {}, create: { id: 'fixture_msg_b_1', conversationId: convB.id, senderId: userB.id, senderRole: 'USER', message: 'Test message from User B.' } });

    return res.status(200).json({
      success: true,
      message: 'Chat fixture seeded successfully.',
      data: {
        superAdmin: { id: superAdmin.id, email: SUPER_ADMIN_EMAIL.toLowerCase().trim(), role: 'super_admin' },
        userA: { id: userA.id, email: USER_A_EMAIL.toLowerCase().trim(), role: 'user', convId: convA.id },
        userB: { id: userB.id, email: USER_B_EMAIL.toLowerCase().trim(), role: 'user', convId: convB.id },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[seed-chat] Error:', message);
    return res.status(500).json({ success: false, message: 'Seed failed: ' + message });
  }
});

export default router;
