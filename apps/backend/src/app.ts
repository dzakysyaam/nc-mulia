import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { authRoutes } from './modules/auth/index.js';
import { userProfileRoutes, adminUserRoutes } from './modules/users/index.js';
import { productsRoutes } from './modules/products/index.js';
import { cartRoutes } from './modules/cart/index.js';
import { transactionRoutes } from './modules/transactions/index.js';
import { paymentRoutes } from './modules/payments/index.js';
import { membershipRoutes } from './modules/memberships/index.js';
import { statsRoutes } from './modules/stats/index.js';
import { bmiRoutes } from './modules/bmi/index.js';
import { consultationRoutes } from './modules/consultations/index.js';
import { chatRoutes } from './modules/chat/index.js';
import { default as seedChatRouter } from './modules/chat/seed-preview.js';
import { locationsRoutes, adminLocationsRoutes } from './modules/locations/index.js';
import rbacRoutes from './modules/rbac/index.js';
import auditRoutes from './modules/audit/index.js';

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { timestamp: new Date().toISOString() } });
});

app.get('/api/debug/routes', (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((layer: any) => {
    if (layer.name === 'router') {
      routes.push(layer.regexp.source.substring(0, 60));
    }
  });
  res.json({ success: true, routes });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userProfileRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/bmi', bmiRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/admin/stats', statsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', seedChatRouter);
app.use('/api/locations', locationsRoutes);
app.use('/api/admin/locations', adminLocationsRoutes);
app.use('/api/admin/rbac', rbacRoutes);
app.use('/api/admin/audit', auditRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
