import { Hono } from 'hono';
import { prisma } from '../index.js';
import { authMiddleware } from './auth.js';

export const seriesRoutes = new Hono();

/**
 * GET /api/series
 * Get all published series, optionally filtered by tropes
 */
seriesRoutes.get('/', async (c) => {
    const tropes = c.req.query('tropes')?.split(',').filter(Boolean);

    const where: any = { status: 'published' };

    if (tropes && tropes.length > 0) {
        where.OR = [
            { tropePrimary: { in: tropes } },
            { tropeSecondary: { in: tropes } },
        ];
    }

    const series = await prisma.series.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { episodes: { where: { status: 'published' } } },
            },
        },
    });

    return c.json({
        series: series.map((s) => ({
            id: s.id,
            slug: s.slug,
            titlePt: s.titlePt,
            descriptionPt: s.descriptionPt,
            coverAssetUrl: s.coverAssetUrl,
            tropePrimary: s.tropePrimary,
            tropeSecondary: s.tropeSecondary,
            tags: s.tags,
            maturityLevel: s.maturityLevel,
            episodeCount: s._count.episodes,
        })),
    });
});

/**
 * GET /api/series/:slug
 * Get series by slug with episodes
 */
seriesRoutes.get('/:slug', async (c) => {
    const slug = c.req.param('slug');

    const series = await prisma.series.findUnique({
        where: { slug },
        include: {
            episodes: {
                where: { status: 'published' },
                orderBy: { number: 'asc' },
                select: {
                    id: true,
                    number: true,
                    titlePt: true,
                    estimatedSeconds: true,
                    isPaywalled: true,
                },
            },
        },
    });

    if (!series) {
        return c.json({ error: 'Series not found' }, 404);
    }

    return c.json({ series });
});

/**
 * GET /api/series/:slug/progress
 * Get user's progress for a series (requires auth)
 */
seriesRoutes.get('/:slug/progress', authMiddleware, async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');

    const series = await prisma.series.findUnique({
        where: { slug },
    });

    if (!series) {
        return c.json({ error: 'Series not found' }, 404);
    }

    const progress = await prisma.progress.findUnique({
        where: {
            userId_seriesId: { userId, seriesId: series.id },
        },
        include: {
            episode: {
                select: { number: true, titlePt: true },
            },
        },
    });

    return c.json({
        progress: progress ? {
            episodeNumber: progress.episode.number,
            episodeTitle: progress.episode.titlePt,
            sceneOrdinal: progress.sceneOrdinal,
            routeFlags: progress.routeFlags,
            meters: progress.meters,
        } : null,
    });
});
