import { prisma } from '../../lib/db.js';

// ── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles() {
  return prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });
}

export async function getRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      navItems: { include: { navigationItem: true } },
    },
  });
}

export async function createRole(data: { name: string; slug: string; description?: string }) {
  const existing = await prisma.role.findFirst({ where: { OR: [{ name: data.name }, { slug: data.slug }] } });
  if (existing) {
    const err: any = new Error('Role dengan nama atau slug tersebut sudah ada.');
    err.statusCode = 409;
    throw err;
  }
  return prisma.role.create({
    data: { name: data.name, slug: data.slug, description: data.description, isSystem: false },
  });
}

export async function updateRole(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    const err: any = new Error('Role tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (role.isSystem) {
    const err: any = new Error('System role tidak dapat diubah.');
    err.statusCode = 403;
    throw err;
  }
  return prisma.role.update({ where: { id }, data: { name: data.name, description: data.description, isActive: data.isActive } });
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    const err: any = new Error('Role tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (role.isSystem) {
    const err: any = new Error('System role tidak dapat dihapus.');
    err.statusCode = 403;
    throw err;
  }
  await prisma.role.delete({ where: { id } });
}

// ── Permissions ─────────────────────────────────────────────────────────────

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
}

export async function setRolePermissions(roleId: string, permissionKeys: string[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    const err: any = new Error('Role tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (role.isSystem && role.slug === 'super_admin') {
    const err: any = new Error('Super Admin permissions tidak dapat diubah.');
    err.statusCode = 403;
    throw err;
  }

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({ roleId, permissionId: p.id })),
    });
  }
}

// ── Navigation Items ─────────────────────────────────────────────────────────

export async function listNavigationItems() {
  return prisma.navigationItem.findMany({
    orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    include: { roleVisibility: { include: { role: true } } },
  });
}

export async function getNavigationForRole(roleId: string) {
  return prisma.navigationItem.findMany({
    where: {
      isActive: true,
      roleVisibility: { some: { roleId } },
    },
    orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function setRoleNavigation(roleId: string, navigationKeys: string[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    const err: any = new Error('Role tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const navItems = await prisma.navigationItem.findMany({ where: { key: { in: navigationKeys } } });
  await prisma.roleNavigationItem.deleteMany({ where: { roleId } });
  if (navItems.length > 0) {
    await prisma.roleNavigationItem.createMany({
      data: navItems.map(n => ({ roleId, navigationItemId: n.id })),
    });
  }
}

// ── Discounts ───────────────────────────────────────────────────────────────

export async function listDiscounts() {
  return prisma.discount.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function updateDiscount(key: string, data: { rate?: number; isActive?: boolean; label?: string }) {
  const discount = await prisma.discount.findUnique({ where: { key } });
  if (!discount) {
    const err: any = new Error('Discount tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (discount.isSystem && data.rate !== undefined && data.rate < 0) {
    const err: any = new Error('Rate tidak valid.');
    err.statusCode = 400;
    throw err;
  }
  const updated = await prisma.discount.update({
    where: { key },
    data: { rate: data.rate, isActive: data.isActive, label: data.label },
  });
  // Clear pricing cache so new rate takes effect immediately
  const { clearDiscountCache } = await import('../pricing/index.js');
  clearDiscountCache();
  return updated;
}

export async function getUserRoles(userId: string) {
  return prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  const perms = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      perms.add(rp.permission.key);
    }
  }
  return Array.from(perms);
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
}

export async function setUserRoles(userId: string, roleIds: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err: any = new Error('User tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (roleIds.length === 0) {
    const err: any = new Error('User harus memiliki setidaknya satu role.');
    err.statusCode = 400;
    throw err;
  }
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.userRole.createMany({ data: roleIds.map(roleId => ({ userId, roleId })) });
}
