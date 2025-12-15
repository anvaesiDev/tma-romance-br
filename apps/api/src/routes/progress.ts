import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';

export const progressRoutes = new Hono();

// Use auth middleware for all routes
progressRoutes.use('*', authMiddleware);

const SaveProgressSchema = z.object({
    seriesId: z.string().uuid(),
    episodeId: z.string().uuid(),
    sceneOrdinal: z.number().int().min(0),
    routeFlags: z.record(z.boolean()).optional(),
    meters: z.record(z.number()).optional(),
});

/**
 * POST /api/progress
 * Save user progress
 */
progressRoutes.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    const parsed = SaveProgressSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
    }

    const { seriesId, episodeId, sceneOrdinal, routeFlags, meters } = parsed.data;

    // Upsert progress
    const progress = await prisma.progress.upsert({
        where: {
            userId_seriesId: { userId, seriesId },
        },
        update: {
            episodeId,
            sceneOrdinal,
            routeFlags: JSON.stringify(routeFlags || {}),
            meters: JSON.stringify(meters || {}),
        },
        create: {
            userId,
            seriesId,
            episodeId,
            sceneOrdinal,
            routeFlags: JSON.stringify(routeFlags || {}),
            meters: JSON.stringify(meters || {}),
        },
    });

    return c.json({ success: true, progress });
});

/**
 * GET /api/progress
 * Get all user progress (for continue cards)
 */
progressRoutes.get('/', async (c) => {
    const userId = c.get('userId');

    const progressList = await prisma.progress.findMany({
        where: { userId },
        include: {
            series: {
                select: {
                    id: true,
                    slug: true,
                    titlePt: true,
                    coverAssetUrl: true,
                    tropePrimary: true,
                },
            },
            episode: {
                select: {
                    id: true,
                    number: true,
                    titlePt: true,
                },
            },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return c.json({
        progress: progressList.map((p) => ({
            seriesId: p.seriesId,
            seriesSlug: p.series.slug,
            seriesTitle: p.series.titlePt,
            seriesCover: p.series.coverAssetUrl,
            tropePrimary: p.series.tropePrimary,
            episodeNumber: p.episode.number,
            episodeTitle: p.episode.titlePt,
            sceneOrdinal: p.sceneOrdinal,
            updatedAt: p.updatedAt,
        })),
    });
});

/**
 * POST /api/progress/complete-episode
 * Mark episode as complete
 */
progressRoutes.post('/complete-episode', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    const { seriesId, episodeId, secondsSpent } = body;

    // Track event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'episode_complete',
            props: JSON.stringify({ seriesId, episodeId, secondsSpent }),
        },
    });

    // Get next episode
    const currentEpisode = await prisma.episode.findUnique({
        where: { id: episodeId },
    });

    if (!currentEpisode) {
        return c.json({ error: 'Episode not found' }, 404);
    }

    const nextEpisode = await prisma.episode.findFirst({
        where: {
            seriesId,
            number: currentEpisode.number + 1,
            status: 'published',
        },
    });

    return c.json({
        success: true,
        nextEpisode: nextEpisode ? {
            id: nextEpisode.id,
            number: nextEpisode.number,
            titlePt: nextEpisode.titlePt,
            isPaywalled: nextEpisode.isPaywalled,
        } : null,
    });
});

/**
 * POST /api/progress/choice
 * Track choice made
 */
progressRoutes.post('/choice', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    const { choiceId, optionId, routeFlags, meters } = body;

    // Track event
    await prisma.event.create({
        data: {
            userId,
            eventName: 'choice_made',
            props: JSON.stringify({ choiceId, optionId }),
        },
    });

    return c.json({ success: true });
});
