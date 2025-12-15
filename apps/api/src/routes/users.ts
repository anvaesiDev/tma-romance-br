import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';
import { getUserId } from '../utils/auth.js';

export const usersRoutes = new Hono();

// Use auth middleware for all routes
usersRoutes.use('*', authMiddleware);

const OnboardingSchema = z.object({
    selectedTropes: z.array(z.string()).min(1).max(3),
    intensity: z.enum(['mild', 'bold']),
    displayName: z.string().min(1).max(50).optional(),
});

/**
 * GET /api/users/me
 * Get current user info
 */
usersRoutes.get('/me', async (c) => {
    const userId = getUserId(c);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            keysBalance: true,
            entitlements: {
                where: {
                    status: 'active',
                    OR: [
                        { endsAt: null },
                        { endsAt: { gt: new Date() } },
                    ],
                },
            },
        },
    });

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
        user: {
            id: user.id,
            tgUserId: user.tgUserId.toString(),
            username: user.username,
            displayName: user.displayName,
            locale: user.locale,
            onboardingComplete: user.onboardingComplete,
            selectedTropes: user.selectedTropes,
            intensity: user.intensity,
            keysBalance: user.keysBalance?.balance || 0,
            streakDays: user.keysBalance?.streakDays || 0,
            hasUnlimited: user.entitlements.some((e) => e.type === 'sub_core' || e.type === 'sub_vip'),
            hasVip: user.entitlements.some((e) => e.type === 'sub_vip'),
        },
    });
});

/**
 * POST /api/users/onboarding
 * Complete onboarding
 */
usersRoutes.post('/onboarding', async (c) => {
    const userId = getUserId(c);
    const body = await c.req.json();
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
    }

    const { selectedTropes, intensity, displayName } = parsed.data;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            selectedTropes: selectedTropes,
            intensity,
            displayName: displayName || undefined,
            onboardingComplete: true,
        },
    });

    // Track event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'onboarding_complete',
            props: { tropes: selectedTropes, intensity },
        },
    });

    return c.json({
        success: true,
        user: {
            selectedTropes: user.selectedTropes,
            intensity: user.intensity,
            displayName: user.displayName,
            onboardingComplete: user.onboardingComplete,
        },
    });
});

/**
 * POST /api/users/claim-daily-keys
 * Claim daily free keys
 */
usersRoutes.post('/claim-daily-keys', async (c) => {
    const userId = getUserId(c);

    const keysBalance = await prisma.keysBalance.findUnique({
        where: { userId },
    });

    if (!keysBalance) {
        return c.json({ error: 'Keys balance not found' }, 404);
    }

    // Check cooldown (24 hours)
    const now = new Date();
    const lastClaim = keysBalance.dailyKeysClaimedAt;

    if (lastClaim) {
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastClaim < 24) {
            const nextClaimAt = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
            return c.json({
                error: 'Daily keys already claimed',
                nextClaimAt,
                remainingSeconds: Math.ceil((nextClaimAt.getTime() - now.getTime()) / 1000),
            }, 429);
        }
    }

    // Calculate streak
    let newStreakDays = 1;
    if (lastClaim) {
        const daysSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastClaim < 2) {
            newStreakDays = keysBalance.streakDays + 1;
        }
    }

    // Daily keys: base 2 + streak bonus (max 3)
    const dailyKeys = 2 + Math.min(newStreakDays - 1, 3);

    await prisma.keysBalance.update({
        where: { userId },
        data: {
            balance: { increment: dailyKeys },
            dailyKeysClaimedAt: now,
            streakDays: newStreakDays,
            lastStreakAt: now,
        },
    });

    return c.json({
        success: true,
        keysGranted: dailyKeys,
        newBalance: keysBalance.balance + dailyKeys,
        streakDays: newStreakDays,
    });
});

/**
 * GET /api/users/stats
 * Get user reading stats
 */
usersRoutes.get('/stats', async (c) => {
    const userId = getUserId(c);

    const [episodesCompleted, choicesMade, totalProgress] = await Promise.all([
        prisma.event.count({
            where: { userId, eventName: 'episode_complete' },
        }),
        prisma.event.count({
            where: { userId, eventName: 'choice_made' },
        }),
        prisma.progress.count({
            where: { userId },
        }),
    ]);

    return c.json({
        stats: {
            episodesCompleted,
            choicesMade,
            seriesStarted: totalProgress,
        },
    });
});
