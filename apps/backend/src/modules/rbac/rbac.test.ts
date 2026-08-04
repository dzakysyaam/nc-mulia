import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const m: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  m.role = { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  m.permission = { findMany: vi.fn(), findFirst: vi.fn() };
  m.rolePermission = { deleteMany: vi.fn(), createMany: vi.fn() };
  m.userRole = { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() };
  m.user = { findUnique: vi.fn() };
  m.navigationItem = { findMany: vi.fn() };
  m.roleNavigationItem = { deleteMany: vi.fn(), createMany: vi.fn() };
  m.discount = { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() };
  return { mockPrisma: m };
});

vi.mock('../../lib/db.js', () => ({ prisma: mockPrisma }));

vi.mock('../../modules/pricing/index.js', () => ({
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

import * as rbacService from './service.js';

// ─────────────────────────────────────────────────────────────────────────────
// RBAC Service tests
// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('listRoles', () => {
    it('returns active roles ordered by name with permissions and user count', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'Admin', slug: 'admin', permissions: [{ permission: { key: 'users:read' } }], _count: { userRoles: 5 } },
        { id: 'r2', name: 'User', slug: 'user', permissions: [], _count: { userRoles: 10 } },
      ]);
      const result = await rbacService.listRoles();
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { permissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('createRole', () => {
    it('creates role when name and slug are unique', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({ id: 'r-new', name: 'Editor', slug: 'editor' });
      const result = await rbacService.createRole({ name: 'Editor', slug: 'editor' });
      expect(result.id).toBe('r-new');
    });

    it('throws 409 when role name already exists', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r1', name: 'Editor', slug: 'editor' });
      await expect(rbacService.createRole({ name: 'Editor', slug: 'editor' })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 409 when slug already exists', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r1', name: 'Other', slug: 'editor' });
      await expect(rbacService.createRole({ name: 'Editor', slug: 'editor' })).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updateRole', () => {
    it('updates role name and description', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Editor', slug: 'editor', isSystem: false });
      mockPrisma.role.update.mockResolvedValue({ id: 'r1', name: 'Editor Pro', slug: 'editor', isSystem: false });
      await rbacService.updateRole('r1', { name: 'Editor Pro', description: 'Can edit' });
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { name: 'Editor Pro', description: 'Can edit', isActive: undefined },
      });
    });

    it('throws 404 when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(rbacService.updateRole('nonexistent', { name: 'New' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when updating system role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Admin', slug: 'admin', isSystem: true });
      await expect(rbacService.updateRole('r1', { name: 'New Name' })).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('deleteRole', () => {
    it('deletes non-system role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Editor', slug: 'editor', isSystem: false });
      mockPrisma.role.delete.mockResolvedValue({ id: 'r1' });
      await expect(rbacService.deleteRole('r1')).resolves.toBeUndefined();
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('throws 403 when deleting system role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Admin', slug: 'admin', isSystem: true });
      await expect(rbacService.deleteRole('r1')).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('setRolePermissions', () => {
    it('replaces role permissions with new set', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Editor', slug: 'editor', isSystem: false });
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', key: 'articles:read' },
        { id: 'p2', key: 'articles:write' },
      ]);
      await rbacService.setRolePermissions('r1', ['articles:read', 'articles:write']);
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'r1', permissionId: 'p1' }, { roleId: 'r1', permissionId: 'p2' }],
      });
    });

    it('clears permissions when empty array passed', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'Editor', slug: 'editor', isSystem: false });
      mockPrisma.permission.findMany.mockResolvedValue([]);
      await rbacService.setRolePermissions('r1', []);
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
      expect(mockPrisma.rolePermission.createMany).not.toHaveBeenCalled();
    });

    it('throws 403 for super_admin role permissions change', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'sa1', name: 'Super Admin', slug: 'super_admin', isSystem: true });
      await expect(rbacService.setRolePermissions('sa1', ['users:read'])).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(rbacService.setRolePermissions('nonexistent', ['users:read'])).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('setUserRoles (service)', () => {
    it('replaces user roles with new set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'John' });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 2 });
      await rbacService.setUserRoles('u1', ['r1', 'r2']);
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(mockPrisma.userRole.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u1', roleId: 'r1' }, { userId: 'u1', roleId: 'r2' }],
      });
    });

    it('throws 400 when empty array passed (must have at least one role)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'John' });
      await expect(rbacService.setUserRoles('u1', [])).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(rbacService.setUserRoles('nonexistent', ['r1'])).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getUserPermissions', () => {
    it('returns deduplicated permission keys from all roles', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { role: { permissions: [{ permission: { key: 'users:read' } }, { permission: { key: 'users:write' } }] } },
        { role: { permissions: [{ permission: { key: 'users:read' } }, { permission: { key: 'products:read' } }] } },
      ]);
      const perms = await rbacService.getUserPermissions('u1');
      expect(perms).toContain('users:read');
      expect(perms).toContain('users:write');
      expect(perms).toContain('products:read');
      expect(perms.filter(p => p === 'users:read')).toHaveLength(1);
    });
  });
});
