import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth.js';
import { getNavigation } from './navigation.js';
import * as ctrl from './controller.js';

const router = Router();

// Navigation — authenticated + admin role
router.get('/navigation', authMiddleware, requirePermission('dashboard:read'), getNavigation);

// Discounts — require settings:read permission
router.get('/discounts', authMiddleware, requirePermission('settings:read'));
router.put('/discounts/:key', authMiddleware, requirePermission('settings:update'), ctrl.updateDiscount);

// Roles — read for any admin, write for super_admin (checked in controller)
router.get('/roles', authMiddleware, requirePermission('roles:read'), ctrl.listRoles);
router.get('/roles/:id', authMiddleware, requirePermission('roles:read'), ctrl.getRole);
router.post('/roles', authMiddleware, ctrl.createRole);
router.put('/roles/:id', authMiddleware, ctrl.updateRole);
router.delete('/roles/:id', authMiddleware, ctrl.deleteRole);

// Role permissions — require roles:manage_permissions
router.get('/permissions', authMiddleware, requirePermission('roles:read'), ctrl.listPermissions);
router.put('/roles/:roleId/permissions', authMiddleware, requirePermission('roles:manage_permissions'), ctrl.setRolePermissions);

// Navigation
router.get('/roles/:roleId/navigation', authMiddleware, requirePermission('menus:read'), ctrl.getRoleNavigation);
router.put('/roles/:roleId/navigation', authMiddleware, requirePermission('menus:update'), ctrl.setRoleNavigation);

// User roles & permissions
router.get('/users/:userId/permissions', authMiddleware, requirePermission('users:assign_role'));
router.put('/users/:userId/roles', authMiddleware, requirePermission('users:assign_role'), ctrl.setUserRoles);

export default router;
