import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';
import { SKU_CATALOG } from '@tma-romance/shared';
import { getUserId } from '../utils/auth.js';

// ==========================================
// User-facing routes (require JWT auth)
// ==========================================
export const paymentsRoutes = new Hono();

// Auth middleware for user routes only
paymentsRoutes.use('*', authMiddleware);

const CreateInvoiceSchema = z.object({
    sku: z.enum(['keys_5', 'keys_15', 'keys_40', 'sub_core', 'sub_vip', 'sub_entry']),
});

/**
 * POST /api/payments/create-invoice
 * Create a Stars invoice link
 */
paymentsRoutes.post('/create-invoice', async (c) => {
    const userId = getUserId(c);
    const body = await c.req.json();
    const parsed = CreateInvoiceSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: 'Invalid SKU' }, 400);
    }

    const { sku } = parsed.data;
    const skuConfig = SKU_CATALOG[sku];

    // Create pending payment record
    const payment = await prisma.payment.create({
        data: {
            userId,
            sku,
            starsAmount: skuConfig.stars,
            status: 'pending',
            invoicePayload: `${userId}_${sku}_${Date.now()}`,
        },
    });

    // Track event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'purchase_start',
            props: JSON.stringify({ sku, starsAmount: skuConfig.stars }),
        },
    });

    const botToken = process.env.BOT_TOKEN;

    // Check if mock payments are enabled explicitly or if bot token is missing
    const isMockMode = process.env.ENABLE_TEST_PAYMENTS === '1' || !botToken;

    if (isMockMode) {
        // Mock mode for development or testing
        return c.json({
            invoiceUrl: `mock://invoice/${payment.id}`,
            paymentId: payment.id,
            mock: true,
        });
    }

    // Create real Telegram invoice link
    try {
        const invoiceParams = {
            title: skuConfig.labelPt,
            description: `TMA Romance BR - ${skuConfig.labelPt}`,
            payload: payment.invoicePayload,
            currency: 'XTR', // Telegram Stars
            prices: [{ label: skuConfig.labelPt, amount: skuConfig.stars }],
        };

        const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceParams),
        });

        const result = await response.json() as { ok: boolean; result?: string; description?: string };

        if (!result.ok) {
            console.error('Failed to create invoice:', result);
            return c.json({ error: 'Failed to create invoice' }, 500);
        }

        return c.json({
            invoiceUrl: result.result,
            paymentId: payment.id,
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return c.json({ error: 'Failed to create invoice' }, 500);
    }
});

/**
 * POST /api/payments/mock-complete
 * Complete a mock payment (development only)
 */
paymentsRoutes.post('/mock-complete', async (c) => {
    // Allow if NOT production OR if explicitly enabled
    const isAllowed = process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_PAYMENTS === '1';

    if (!isAllowed) {
        return c.json({ error: 'Not available in production' }, 403);
    }

    const userId = getUserId(c);
    const body = await c.req.json();
    const { paymentId } = body;

    const payment = await prisma.payment.findFirst({
        where: { id: paymentId, userId, status: 'pending' },
    });

    if (!payment) {
        return c.json({ error: 'Payment not found' }, 404);
    }

    // Simulate successful payment
    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: 'paid',
            telegramChargeId: `mock_${Date.now()}`,
            paidAt: new Date(),
        },
    });

    // Grant entitlement
    const sku = payment.sku as keyof typeof SKU_CATALOG;

    if (sku.startsWith('keys_')) {
        const keysToAdd = sku === 'keys_5' ? 5 : sku === 'keys_15' ? 15 : 40;

        await prisma.keysBalance.upsert({
            where: { userId },
            update: { balance: { increment: keysToAdd } },
            create: { userId, balance: keysToAdd },
        });
    } else {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 30);

        await prisma.entitlement.create({
            data: {
                userId,
                type: sku,
                source: 'stars',
                endsAt,
                status: 'active',
            },
        });
    }

    // Track event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'purchase_success',
            props: JSON.stringify({ sku: payment.sku, starsAmount: payment.starsAmount, mock: true }),
        },
    });

    return c.json({ success: true });
});

/**
 * GET /api/payments/entitlements
 * Get user's active entitlements
 */
paymentsRoutes.get('/entitlements', async (c) => {
    const userId = getUserId(c);

    const entitlements = await prisma.entitlement.findMany({
        where: {
            userId,
            status: 'active',
            OR: [
                { endsAt: null },
                { endsAt: { gt: new Date() } },
            ],
        },
    });

    const keysBalance = await prisma.keysBalance.findUnique({
        where: { userId },
    });

    return c.json({
        entitlements: entitlements.map((e) => ({
            id: e.id,
            type: e.type,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
        })),
        keysBalance: keysBalance?.balance || 0,
        hasUnlimited: entitlements.some((e) => e.type === 'sub_core' || e.type === 'sub_vip'),
        hasVip: entitlements.some((e) => e.type === 'sub_vip'),
    });
});

// ==========================================
// Bot webhook routes (NO auth middleware)
// ==========================================
export const webhookRoutes = new Hono();

// Zod schema for strict webhook payload validation
const WebhookPayloadSchema = z.object({
    invoicePayload: z.string().min(1),
    telegramChargeId: z.string().min(1),
    providerPaymentId: z.string().optional(),
    totalAmount: z.number().optional(),
    userId: z.string().optional(),
});

/**
 * POST /api/webhook/payment
 * Handle Telegram payment webhook (called by bot)
 * 
 * This route is NOT protected by authMiddleware.
 * It uses X-Webhook-Secret header for bot authentication.
 */
webhookRoutes.post('/payment', async (c) => {
    const webhookSecret = c.req.header('X-Webhook-Secret');

    // Validate webhook secret
    if (!process.env.BOT_WEBHOOK_SECRET) {
        console.error('❌ BOT_WEBHOOK_SECRET not configured');
        return c.json({ error: 'Webhook not configured' }, 500);
    }

    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
        console.warn('⚠️ Webhook auth failed - invalid secret');
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Parse and validate body
    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        console.error('❌ Webhook failed to parse JSON body');
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = WebhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
        console.error('❌ Webhook payload validation failed:', parsed.error.format());
        return c.json({ error: 'Invalid payload', details: parsed.error.format() }, 400);
    }

    const { invoicePayload, telegramChargeId, providerPaymentId } = parsed.data;

    // Find payment by payload
    const payment = await prisma.payment.findFirst({
        where: { invoicePayload },
    });

    if (!payment) {
        console.error(`❌ Webhook: Payment not found for payload: ${invoicePayload}`);
        return c.json({ error: 'Payment not found' }, 404);
    }

    // Idempotency check - if already processed, return success
    if (payment.status === 'paid') {
        console.log(`✅ Webhook: Payment already processed (idempotent): ${payment.id}`);
        return c.json({ success: true, alreadyProcessed: true });
    }

    // Also check by telegramChargeId for extra idempotency
    const existingByChargeId = await prisma.payment.findFirst({
        where: { telegramChargeId, status: 'paid' },
    });

    if (existingByChargeId) {
        console.log(`✅ Webhook: Duplicate telegramChargeId detected: ${telegramChargeId}`);
        return c.json({ success: true, alreadyProcessed: true });
    }

    // Update payment as paid
    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: 'paid',
            telegramChargeId,
            providerPaymentId,
            paidAt: new Date(),
        },
    });

    // Grant entitlement based on SKU
    const sku = payment.sku as keyof typeof SKU_CATALOG;

    if (sku.startsWith('keys_')) {
        // Add keys to balance
        const keysToAdd = sku === 'keys_5' ? 5 : sku === 'keys_15' ? 15 : 40;

        await prisma.keysBalance.upsert({
            where: { userId: payment.userId },
            update: { balance: { increment: keysToAdd } },
            create: { userId: payment.userId, balance: keysToAdd },
        });

        console.log(`✅ Webhook: Granted ${keysToAdd} keys to user ${payment.userId}`);
    } else {
        // Create subscription entitlement
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 30); // 30 days

        await prisma.entitlement.create({
            data: {
                userId: payment.userId,
                type: sku,
                source: 'stars',
                endsAt,
                status: 'active',
            },
        });

        console.log(`✅ Webhook: Granted ${sku} subscription to user ${payment.userId}`);
    }

    // Track event
    await prisma.event.create({
        data: {
            userId: payment.userId,
            eventName: 'purchase_success',
            props: JSON.stringify({ sku: payment.sku, starsAmount: payment.starsAmount }),
        },
    });

    console.log(`✅ Webhook: Payment ${payment.id} processed successfully`);
    return c.json({ success: true });
});
