import { Hono } from 'hono';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';

export const episodesRoutes = new Hono();

/**
 * GET /api/episodes/:id
 * Get episode with all scenes
 */
episodesRoutes.get('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');

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
        const hasAccess = await checkUserAccess(userId);

        if (!hasAccess) {
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
    const userId = c.get('userId');

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
        const hasAccess = await checkUserAccess(userId);

        if (!hasAccess) {
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
 * Check if user has access (subscription or keys)
 */
async function checkUserAccess(userId: string): Promise<boolean> {
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

    if (subscription) return true;

    // Check keys balance
    const keysBalance = await prisma.keysBalance.findUnique({
        where: { userId },
    });

    if (keysBalance && keysBalance.balance > 0) {
        // Consume a key
        await prisma.keysBalance.update({
            where: { userId },
            data: { balance: { decrement: 1 } },
        });
        return true;
    }

    return false;
}
