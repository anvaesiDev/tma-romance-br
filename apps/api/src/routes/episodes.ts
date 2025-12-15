import { Hono } from 'hono';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';
import { getUserId } from '../utils/auth.js';

export const episodesRoutes = new Hono();

/**
 * GET /api/episodes/:id
 * Get episode with all scenes
 */
episodesRoutes.get('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const userId = getUserId(c);

    const episode = await prisma.episode.findUnique({
        where: { id },
        include: {
            series: {
                select: { id: true, slug: true, titlePt: true },
            },
            scenes: {
                orderBy: { ordinal: 'asc' },
            },
        },
    });

    if (!episode) {
        return c.json({ error: 'Episode not found' }, 404);
    }

    // Check if episode is paywalled and user has access
    if (episode.isPaywalled) {
        const accessResult = await checkUserAccess(userId, episode.id);

        if (!accessResult.hasAccess) {
            // Return episode metadata but not scenes
            return c.json({
                episode: {
                    id: episode.id,
                    number: episode.number,
                    titlePt: episode.titlePt,
                    seriesId: episode.series.id,
                    seriesSlug: episode.series.slug,
                    seriesTitle: episode.series.titlePt,
                    isPaywalled: true,
                    requiresPayment: true,
                    canUnlockWithKey: accessResult.canUnlockWithKey,
                    keysBalance: accessResult.keysBalance,
                },
            });
        }
    }

    // Track episode start event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'episode_start',
            props: JSON.stringify({ seriesId: episode.seriesId, episodeId: episode.id }),
        },
    });

    return c.json({
        episode: {
            id: episode.id,
            number: episode.number,
            titlePt: episode.titlePt,
            estimatedSeconds: episode.estimatedSeconds,
            seriesId: episode.series.id,
            seriesSlug: episode.series.slug,
            seriesTitle: episode.series.titlePt,
            isPaywalled: episode.isPaywalled,
            requiresPayment: false,
            scenes: episode.scenes.map((s) => ({
                id: s.id,
                ordinal: s.ordinal,
                type: s.type,
                payload: typeof s.payload === 'string' ? JSON.parse(s.payload) : s.payload,
            })),
        },
    });
});

/**
 * GET /api/episodes/by-number/:seriesSlug/:number
 * Get episode by series slug and episode number
 */
episodesRoutes.get('/by-number/:seriesSlug/:number', authMiddleware, async (c) => {
    const seriesSlug = c.req.param('seriesSlug');
    const number = parseInt(c.req.param('number'));
    const userId = getUserId(c);

    const series = await prisma.series.findUnique({
        where: { slug: seriesSlug },
    });

    if (!series) {
        return c.json({ error: 'Series not found' }, 404);
    }

    const episode = await prisma.episode.findUnique({
        where: {
            seriesId_number: { seriesId: series.id, number },
        },
        include: {
            scenes: {
                orderBy: { ordinal: 'asc' },
            },
        },
    });

    if (!episode) {
        return c.json({ error: 'Episode not found' }, 404);
    }

    // Check paywall
    if (episode.isPaywalled) {
        const accessResult = await checkUserAccess(userId, episode.id);

        if (!accessResult.hasAccess) {
            return c.json({
                episode: {
                    id: episode.id,
                    number: episode.number,
                    titlePt: episode.titlePt,
                    seriesId: series.id,
                    seriesSlug: series.slug,
                    seriesTitle: series.titlePt,
                    isPaywalled: true,
                    requiresPayment: true,
                    canUnlockWithKey: accessResult.canUnlockWithKey,
                    keysBalance: accessResult.keysBalance,
                },
            });
        }
    }

    return c.json({
        episode: {
            id: episode.id,
            number: episode.number,
            titlePt: episode.titlePt,
            estimatedSeconds: episode.estimatedSeconds,
            seriesId: series.id,
            seriesSlug: series.slug,
            seriesTitle: series.titlePt,
            isPaywalled: episode.isPaywalled,
            requiresPayment: false,
            scenes: episode.scenes.map((s) => ({
                id: s.id,
                ordinal: s.ordinal,
                type: s.type,
                payload: typeof s.payload === 'string' ? JSON.parse(s.payload) : s.payload,
            })),
        },
    });
});

/**
 * POST /api/episodes/:id/unlock
 * Unlock episode with a key (explicit action, not auto-deduction)
 */
episodesRoutes.post('/:id/unlock', authMiddleware, async (c) => {
    const episodeId = c.req.param('id');
    const userId = getUserId(c);

    // Check episode exists
    const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
    });

    if (!episode) {
        return c.json({ error: 'Episode not found' }, 404);
    }

    // Check if already unlocked
    const existingUnlock = await prisma.episodeUnlock.findUnique({
        where: { userId_episodeId: { userId, episodeId } },
    });

    if (existingUnlock) {
        return c.json({ success: true, alreadyUnlocked: true, method: existingUnlock.method });
    }

    // Check if user has active subscription (auto-unlock for subscribers)
    const subscription = await prisma.entitlement.findFirst({
        where: {
            userId,
            type: { in: ['sub_core', 'sub_vip'] },
            status: 'active',
            OR: [
                { endsAt: null },
                { endsAt: { gt: new Date() } },
            ],
        },
    });

    if (subscription) {
        // Create unlock record for subscriber
        await prisma.episodeUnlock.create({
            data: {
                userId,
                episodeId,
                method: subscription.type,
            },
        });

        return c.json({ success: true, method: subscription.type });
    }

    // Check keys balance
    const keysBalance = await prisma.keysBalance.findUnique({
        where: { userId },
    });

    if (!keysBalance || keysBalance.balance <= 0) {
        return c.json({
            error: 'Sem chaves disponíveis',
            errorCode: 'NO_KEYS',
            keysBalance: keysBalance?.balance || 0,
        }, 402);
    }

    // Consume key and create unlock record (atomic transaction)
    await prisma.$transaction([
        prisma.keysBalance.update({
            where: { userId },
            data: { balance: { decrement: 1 } },
        }),
        prisma.episodeUnlock.create({
            data: {
                userId,
                episodeId,
                method: 'key',
            },
        }),
        prisma.event.create({
            data: {
                userId,
                eventName: 'key_used',
                props: JSON.stringify({ episodeId }),
            },
        }),
    ]);

    return c.json({
        success: true,
        method: 'key',
        keysBalance: keysBalance.balance - 1,
    });
});

/**
 * Check if user has access (subscription or existing unlock)
 * Does NOT auto-deduct keys
 */
interface AccessResult {
    hasAccess: boolean;
    canUnlockWithKey: boolean;
    keysBalance: number;
    method?: string;
}

async function checkUserAccess(userId: string, episodeId: string): Promise<AccessResult> {
    // Check existing unlock record
    const existingUnlock = await prisma.episodeUnlock.findUnique({
        where: { userId_episodeId: { userId, episodeId } },
    });

    if (existingUnlock) {
        return { hasAccess: true, canUnlockWithKey: false, keysBalance: 0, method: existingUnlock.method };
    }

    // Check active subscription
    const subscription = await prisma.entitlement.findFirst({
        where: {
            userId,
            type: { in: ['sub_core', 'sub_vip'] },
            status: 'active',
            OR: [
                { endsAt: null },
                { endsAt: { gt: new Date() } },
            ],
        },
    });

    if (subscription) {
        // For subscribers, auto-create unlock record
        await prisma.episodeUnlock.create({
            data: {
                userId,
                episodeId,
                method: subscription.type,
            },
        });
        return { hasAccess: true, canUnlockWithKey: false, keysBalance: 0, method: subscription.type };
    }

    // Check keys balance (no deduction here!)
    const keysBalance = await prisma.keysBalance.findUnique({
        where: { userId },
    });

    const balance = keysBalance?.balance || 0;

    return {
        hasAccess: false,
        canUnlockWithKey: balance > 0,
        keysBalance: balance,
    };
}
