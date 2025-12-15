import { useEffect, useState } from 'preact/hooks';
import { navigate, isLoading } from '../store';
import { fetchSeriesDetail } from '../api';
import { TROPES } from '@tma-romance/shared';

interface StoryScreenProps {
    slug: string;
}

interface SeriesDetail {
    id: string;
    slug: string;
    titlePt: string;
    descriptionPt: string;
    coverAssetUrl?: string;
    tropePrimary: string;
    tropeSecondary?: string;
    tags: string[];
    maturityLevel: string;
    episodes: Array<{
        id: string;
        number: number;
        titlePt: string;
        estimatedSeconds: number;
        isPaywalled: boolean;
    }>;
}

export function StoryScreen({ slug }: StoryScreenProps) {
    const [series, setSeries] = useState<SeriesDetail | null>(null);

    useEffect(() => {
        loadSeries();
    }, [slug]);

    const loadSeries = async () => {
        isLoading.value = true;
        try {
            const result = await fetchSeriesDetail(slug);
            // Parse tags if it's a string (SQLite)
            const parsedTags = typeof result.series.tags === 'string'
                ? JSON.parse(result.series.tags)
                : result.series.tags;
            setSeries({ ...result.series, tags: parsedTags });
        } catch (err) {
            console.error('Failed to load series:', err);
        } finally {
            isLoading.value = false;
        }
    };

    if (!series) {
        return (
            <div class="screen items-center justify-center">
                <div class="text-4xl animate-pulse">📖</div>
                <p class="text-gray-400 mt-4">Загрузка истории…</p>
            </div>
        );
    }

    const primaryTrope = TROPES.find(t => t.id === series.tropePrimary);
    const secondaryTrope = series.tropeSecondary ? TROPES.find(t => t.id === series.tropeSecondary) : null;

    const totalMinutes = Math.ceil(series.episodes.reduce((acc, ep) => acc + ep.estimatedSeconds, 0) / 60);

    return (
        <div class="screen">
            {/* Header with back button */}
            <div class="screen-header">
                <button
                    onClick={() => navigate({ page: 'home' })}
                    class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <span>←</span>
                    <span>Назад</span>
                </button>
            </div>

            <div class="screen-content space-y-6">
                {/* Cover and title */}
                <div class="text-center">
                    <div class="w-32 h-44 mx-auto rounded-2xl bg-gradient-to-br from-primary-700/30 to-accent-500/30 flex items-center justify-center text-5xl mb-4">
                        💕
                    </div>

                    <h1 class="text-title-lg">{series.titlePt}</h1>

                    <p class="text-gray-400 mt-2 text-sm">
                        {series.episodes.length} эпизодов • ~{totalMinutes} мин
                    </p>
                </div>

                {/* Trope chips */}
                <div class="flex flex-wrap justify-center gap-2">
                    {primaryTrope && (
                        <span class="trope-chip">
                            {primaryTrope.emoji} {primaryTrope.labelRu || primaryTrope.labelPt}
                        </span>
                    )}
                    {secondaryTrope && (
                        <span class="trope-chip">
                            {secondaryTrope.emoji} {secondaryTrope.labelRu || secondaryTrope.labelPt}
                        </span>
                    )}
                </div>

                {/* Description */}
                <p class="text-gray-300 text-center leading-relaxed">
                    {series.descriptionPt}
                </p>

                {/* Episodes list */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Эпизоды</h2>
                    <div class="space-y-2">
                        {series.episodes.map((ep, index) => (
                            <button
                                key={ep.id}
                                onClick={() => navigate({ page: 'reader', seriesSlug: slug, episodeNumber: ep.number })}
                                class="w-full p-4 rounded-xl bg-dark-card border border-dark-border text-left hover:border-primary-700/50 transition-colors"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <span class="w-8 h-8 rounded-full bg-primary-700/20 flex items-center justify-center text-sm font-semibold text-primary-400">
                                            {ep.number}
                                        </span>
                                        <div>
                                            <p class="font-medium">{ep.titlePt}</p>
                                            <p class="text-xs text-gray-500">
                                                ~{Math.ceil(ep.estimatedSeconds / 60)} мин
                                            </p>
                                        </div>
                                    </div>

                                    {ep.isPaywalled && (
                                        <span class="text-xs px-2 py-1 rounded-full bg-accent-500/20 text-accent-400">
                                            🔒 VIP
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* CTA */}
            <div class="screen-footer">
                <button
                    onClick={() => navigate({ page: 'reader', seriesSlug: slug, episodeNumber: 0 })}
                    class="btn-primary"
                >
                    Начать читать
                </button>
            </div>
        </div>
    );
}
