/**
 * seed-chat-preview.ts
 *
 * Idempotent chat fixture seed for Vercel Preview environment.
 * Creates: SUPER_ADMIN, USER_A, USER_B + chat conversations + messages.
 * Run:  npx tsx src/seed-chat-preview.ts
 *      or via Vercel: npx vercel env run -- npx tsx src/seed-chat-preview.ts
 *
 * Credentials come from SEED_CHAT_* env vars (NOT hardcoded).
 */

import 'dotenv/config';
import { prisma } from './lib/db.js';
import bcrypt from 'bcryptjs';

// ── Deterministic fixture IDs ──────────────────────────────────────────────────
const FIXTURE_IDS = {
  SUPER_ADMIN: 'fixture_super_admin',
  USER_A:      'fixture_user_a',
  USER_B:      'fixture_user_b',
  CONV_A:      'fixture_conv_user_a',
  CONV_B:      'fixture_conv_user_b',
};

// ── Derived env-var based IDs ─────────────────────────────────────────────────
const getEnv = (key: string, fallback: string): string => {
  const val = process.env[key];
  if (!val) {
    console.warn(`  [seed-chat] ${key} not set — using fallback: ${fallback}`);
  }
  return val ?? fallback;
};

// ── Verify not Production ───────────────────────────────────────────────────────
function guardPreview() {
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
    // Allow if explicitly targeting preview DB via Railway URL pattern
    const dbUrl = process.env.DATABASE_URL ?? '';
    const isRailwayProduction = dbUrl.includes('railway') && !dbUrl.includes('preview') && !dbUrl.includes('test');
    if (isRailwayProduction) {
      console.error('[seed-chat] ABORT: Refusing to seed production database.');
      console.error('[seed-chat] Set FORCE_SEED=1 to override (not recommended).');
      process.exit(1);
    }
  }
}

// ── Main seed ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log('[seed-chat] Starting chat fixture seed...\n');
  guardPreview();

  const superAdminEmail = getEnv('SEED_CHAT_SUPER_ADMIN_EMAIL', 'superadmin@preview.local');
  const superAdminPassword = getEnv('SEED_CHAT_SUPER_ADMIN_PASSWORD', 'PreviewAdmin123!');
  const userAEmail = getEnv('SEED_CHAT_USER_A_EMAIL', 'usera@preview.local');
  const userAPassword = getEnv('SEED_CHAT_USER_A_PASSWORD', 'UserA123456!');
  const userBEmail = getEnv('SEED_CHAT_USER_B_EMAIL', 'userb@preview.local');
  const userBPassword = getEnv('SEED_CHAT_USER_B_PASSWORD', 'UserB123456!');

  // ── 1. Resolve role IDs ─────────────────────────────────────────────────────
  const superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });
  const userRole = await prisma.role.findUnique({ where: { slug: 'user' } });

  if (!superAdminRole) {
    console.error('[seed-chat] ERROR: super_admin role not found. Run seed.ts first.');
    process.exit(1);
  }
  if (!userRole) {
    console.error('[seed-chat] ERROR: user role not found. Run seed.ts first.');
    process.exit(1);
  }
  console.log(`  Roles resolved: super_admin=${superAdminRole.id}, user=${userRole.id}`);

  // ── 2. Create SUPER_ADMIN (upsert) ──────────────────────────────────────────
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail.toLowerCase() },
    update: { name: 'Preview Super Admin', passwordHash: superAdminHash, isActive: true },
    create: { id: FIXTURE_IDS.SUPER_ADMIN, name: 'Preview Super Admin', email: superAdminEmail.toLowerCase(), passwordHash: superAdminHash, isActive: true, membershipStatus: 'REGULAR' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: superAdminRole.id },
  });
  console.log(`  SUPER_ADMIN: ${superAdmin.email} (id=${superAdmin.id})`);

  // ── 3. Create USER A (upsert) ───────────────────────────────────────────────
  const userAHash = await bcrypt.hash(userAPassword, 10);
  const userA = await prisma.user.upsert({
    where: { email: userAEmail.toLowerCase() },
    update: { name: 'Preview User A', passwordHash: userAHash, isActive: true },
    create: { id: FIXTURE_IDS.USER_A, name: 'Preview User A', email: userAEmail.toLowerCase(), passwordHash: userAHash, isActive: true, membershipStatus: 'REGULAR' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: userA.id, roleId: userRole.id } },
    update: {},
    create: { userId: userA.id, roleId: userRole.id },
  });
  console.log(`  USER_A: ${userA.email} (id=${userA.id})`);

  // ── 4. Create USER B (upsert) ───────────────────────────────────────────────
  const userBHash = await bcrypt.hash(userBPassword, 10);
  const userB = await prisma.user.upsert({
    where: { email: userBEmail.toLowerCase() },
    update: { name: 'Preview User B', passwordHash: userBHash, isActive: true },
    create: { id: FIXTURE_IDS.USER_B, name: 'Preview User B', email: userBEmail.toLowerCase(), passwordHash: userBHash, isActive: true, membershipStatus: 'REGULAR' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: userB.id, roleId: userRole.id } },
    update: {},
    create: { userId: userB.id, roleId: userRole.id },
  });
  console.log(`  USER_B: ${userB.email} (id=${userB.id})`);

  // ── 5. Create CONV_A for USER A (upsert) ────────────────────────────────────
  const convA = await prisma.chatConversation.upsert({
    where: { id: FIXTURE_IDS.CONV_A },
    update: { userId: userA.id, customerName: 'Preview User A', category: 'SERVICE', status: 'OPEN' },
    create: { id: FIXTURE_IDS.CONV_A, userId: userA.id, customerName: 'Preview User A', category: 'SERVICE', status: 'OPEN' },
  });
  console.log(`  CONV_A: id=${convA.id} (userId=${convA.userId})`);

  // ── 6. Create CONV_B for USER B (upsert) ────────────────────────────────────
  const convB = await prisma.chatConversation.upsert({
    where: { id: FIXTURE_IDS.CONV_B },
    update: { userId: userB.id, customerName: 'Preview User B', category: 'SERVICE', status: 'OPEN' },
    create: { id: FIXTURE_IDS.CONV_B, userId: userB.id, customerName: 'Preview User B', category: 'SERVICE', status: 'OPEN' },
  });
  console.log(`  CONV_B: id=${convB.id} (userId=${convB.userId})`);

  // ── 7. Seed messages in CONV_A ───────────────────────────────────────────────
  const msg1 = await prisma.chatMessage.upsert({
    where: { id: 'fixture_msg_a_1' },
    update: {},
    create: { id: 'fixture_msg_a_1', conversationId: convA.id, senderId: userA.id, senderRole: 'USER', message: 'Halo, saya ingin bertanya tentang produk Herbalife.' },
  });
  const msg2 = await prisma.chatMessage.upsert({
    where: { id: 'fixture_msg_a_2' },
    update: {},
    create: { id: 'fixture_msg_a_2', conversationId: convA.id, senderId: userA.id, senderRole: 'USER', message: 'Apakah ada promo untuk paket nutrisi?' },
  });
  const msg3 = await prisma.chatMessage.upsert({
    where: { id: 'fixture_msg_a_3' },
    update: {},
    create: { id: 'fixture_msg_a_3', conversationId: convA.id, senderId: 'SYSTEM', senderRole: 'ADMIN', message: 'Terima kasih atas pertanyaannya! Tim kami akan segera membantu.' },
  });
  console.log(`  CONV_A messages: ${[msg1, msg2, msg3].length} seeded`);

  // ── 8. Seed message in CONV_B ──────────────────────────────────────────────
  const msgB = await prisma.chatMessage.upsert({
    where: { id: 'fixture_msg_b_1' },
    update: {},
    create: { id: 'fixture_msg_b_1', conversationId: convB.id, senderId: userB.id, senderRole: 'USER', message: 'Test message from User B.' },
  });
  console.log(`  CONV_B messages: 1 seeded`);

  // ── 9. Summary ──────────────────────────────────────────────────────────────
  console.log('\n[seed-chat] Fixture summary:');
  console.log(`  SUPER_ADMIN: ${superAdmin.email}`);
  console.log(`  USER_A:      ${userA.email}  → conversation ${convA.id}`);
  console.log(`  USER_B:      ${userB.email}  → conversation ${convB.id}`);
  console.log('\n[seed-chat] Seed completed successfully.');
  console.log('\n  NOTE: Passwords sourced from SEED_CHAT_* env vars.');
  console.log('  Set these in Vercel Preview environment:');
  console.log('    SEED_CHAT_SUPER_ADMIN_EMAIL=superadmin@preview.local');
  console.log('    SEED_CHAT_SUPER_ADMIN_PASSWORD=<secure_password>');
  console.log('    SEED_CHAT_USER_A_EMAIL=usera@preview.local');
  console.log('    SEED_CHAT_USER_A_PASSWORD=<secure_password>');
  console.log('    SEED_CHAT_USER_B_EMAIL=userb@preview.local');
  console.log('    SEED_CHAT_USER_B_PASSWORD=<secure_password>');
  process.exit(0);
}

seed().catch(err => {
  console.error('[seed-chat] Seed failed:', err.message);
  process.exit(1);
});
