import { Hono } from 'hono';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as jose from 'jose';
import { prisma } from '../index.js';

export const authRoutes = new Hono();

// Schema for Telegram initData validation
const AuthSchema = z.object({
    initData: z.string(),
});

// JWT secret (in production, use env variable)
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

/**
 * Verify Telegram WebApp initData
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData: string, botToken: string): { valid: boolean; data?: Record<string, string> } {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');

        if (!hash) return { valid: false };

        // Remove hash and sort params
        params.delete('hash');
        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Create secret key
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Calculate hash
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(sortedParams)
            .digest('hex');

        if (calculatedHash !== hash) {
            return { valid: false };
        }

        // Check auth_date freshness (1 hour TTL)
        const authDate = parseInt(params.get('auth_date') || '0');
        const now = Math.floor(Date.now() / 1000);
        const oneHour = 3600;

        if (now - authDate > oneHour) {
            return { valid: false };
        }

        // Parse user data
        const data: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
            data[key] = value;
        }

        return { valid: true, data };
    } catch (error) {
        console.error('Error verifying initData:', error);
        return { valid: false };
    }
}

/**
 * POST /api/auth/telegram
 * Authenticate using Telegram WebApp initData
 */
authRoutes.post('/telegram', async (c) => {
    const body = await c.req.json();
    const parsed = AuthSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: 'Invalid request body' }, 400);
    }

    const { initData } = parsed.data;
    const botToken = process.env.BOT_TOKEN;

    // In development, allow mock auth
    const isDev = process.env.NODE_ENV !== 'production';
    let userData: { id: string; username?: string; first_name?: string } | null = null;
    let sourceId: string | undefined;

    if (isDev && initData.startsWith('mock_')) {
        // Mock auth for development
        const mockId = initData.replace('mock_', '') || '12345678';
        userData = { id: mockId, username: 'dev_user', first_name: 'Dev' };
    } else if (botToken) {
        // Real Telegram verification
        const result = verifyTelegramInitData(initData, botToken);

        if (!result.valid || !result.data) {
            return c.json({ error: 'Invalid initData' }, 401);
        }

        // Parse user from initData
        try {
            const userJson = result.data['user'];
            if (userJson) {
                userData = JSON.parse(userJson);
            }

            // Extract source from start_param
            const startParam = result.data['start_param'];
            if (startParam) {
                // Format: src_<sourceId>_series_<slug>
                const match = startParam.match(/^src_([^_]+)/);
                if (match) {
                    sourceId = match[1];
                }
            }
        } catch (e) {
            return c.json({ error: 'Failed to parse user data' }, 400);
        }
    } else {
        // No bot token and not in dev mode
        return c.json({ error: 'Authentication not configured' }, 500);
    }

    if (!userData?.id) {
        return c.json({ error: 'User ID not found' }, 400);
    }

    const tgUserId = BigInt(userData.id);

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { tgUserId },
        include: { keysBalance: true },
    });

    if (!user) {
        // Create new user
        user = await prisma.user.create({
            data: {
                tgUserId,
                username: userData.username,
                displayName: userData.first_name,
                marketingSourceFirst: sourceId,
                marketingSourceLast: sourceId,
                keysBalance: {
                    create: { balance: 3 }, // Start with 3 free keys
                },
            },
            include: { keysBalance: true },
        });

        // Track event
        await prisma.event.create({
            data: {
                userId: user.id,
                eventName: 'miniapp_open',
                props: JSON.stringify({ source: sourceId, is_new: true }),
            },
        });
    } else {
        // Update last seen and source
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastSeenAt: new Date(),
                marketingSourceLast: sourceId || user.marketingSourceLast,
            },
        });

        // Track event
        await prisma.event.create({
            data: {
                userId: user.id,
                eventName: 'miniapp_open',
                props: JSON.stringify({ source: sourceId, is_new: false }),
            },
        });
    }

    // Generate JWT
    const token = await new jose.SignJWT({
        userId: user.id,
        tgUserId: userData.id,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .setIssuedAt()
        .sign(JWT_SECRET);

    return c.json({
        token,
        user: {
            id: user.id,
            tgUserId: userData.id,
            username: user.username,
            displayName: user.displayName,
            onboardingComplete: user.onboardingComplete,
            selectedTropes: user.selectedTropes,
            intensity: user.intensity,
            keysBalance: user.keysBalance?.balance || 0,
        },
    });
});

/**
 * Middleware to verify JWT token
 */
export async function authMiddleware(c: any, next: any) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);

    try {
        const { payload } = await jose.jwtVerify(token, JWT_SECRET);
        c.set('userId', payload.userId);
        c.set('tgUserId', payload.tgUserId);
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
}
