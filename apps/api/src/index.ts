import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { PrismaClient } from '@prisma/client';

import { authRoutes } from './routes/auth.js';
import { seriesRoutes } from './routes/series.js';
import { episodesRoutes } from './routes/episodes.js';
import { progressRoutes } from './routes/progress.js';
import { paymentsRoutes } from './routes/payments.js';
import { usersRoutes } from './routes/users.js';

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['https://tma-romance-br-web.vercel.app', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/series', seriesRoutes);
app.route('/api/episodes', episodesRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/users', usersRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ error: 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.API_PORT || '3000');

console.log(`🚀 TMA Romance BR API starting on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});

export default app;
