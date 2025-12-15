import { useEffect } from 'preact/hooks';
import { currentUser, seriesList, progressList, navigate, isLoading } from '../store';
import { fetchSeriesList, fetchProgress, claimDailyKeys } from '../api';
import { SeriesCard } from '../components/SeriesCard';
import { KeysBar } from '../components/KeysBar';
import { ptBR } from '@tma-romance/shared';

const t = ptBR;

export function HomeScreen() {
    useEffect(() => {
        // Refresh data on mount
        refreshData();
    }, []);

    const refreshData = async () => {
        isLoading.value = true;
        try {
            // Don't filter by tropes - fetch all series
            await Promise.all([
                fetchSeriesList(),
                fetchProgress(),
            ]);
        } finally {
            isLoading.value = false;
        }
    };

    const handleClaimKeys = async () => {
        try {
            const result = await claimDailyKeys();
            alert(`🎉 +${result.keysGranted} chaves! (${result.streakDays} dias seguidos)`);
        } catch (err: any) {
            if (err.message?.includes('already claimed')) {
                alert('Você já pegou suas chaves hoje. Volte amanhã!');
            }
        }
    };

    // Get continue reading item (most recent progress)
    const continueItem = progressList.value[0];

    // Parse selectedTropes (it's a JSON string from SQLite)
    const userTropes: string[] = (() => {
        try {
            const tropes = currentUser.value?.selectedTropes;
            if (!tropes) return [];
            if (Array.isArray(tropes)) return tropes;
            return JSON.parse(tropes as string);
        } catch {
            return [];
        }
    })();

    // Filter series by user's tropes
    const recommendedSeries = seriesList.value.filter(s =>
        userTropes.includes(s.tropePrimary) ||
        (s.tropeSecondary && userTropes.includes(s.tropeSecondary))
    );

    const allSeries = seriesList.value;

    return (
        <div class="screen">
            {/* Header */}
            <div class="screen-header">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-title">
                            {currentUser.value?.displayName
                                ? `Oi, ${currentUser.value.displayName}! 💕`
                                : 'Oi! 💕'}
                        </h1>
                        <p class="text-sm text-gray-400 mt-1">O que vamos ler hoje?</p>
                    </div>

                    <button
                        onClick={() => navigate({ page: 'settings' })}
                        class="p-2 rounded-full bg-dark-card border border-dark-border"
                    >
                        ⚙️
                    </button>
                </div>

                {/* Keys bar */}
                <div class="mt-4">
                    <KeysBar
                        balance={currentUser.value?.keysBalance || 0}
                        hasUnlimited={currentUser.value?.hasUnlimited || false}
                        onClaimDaily={handleClaimKeys}
                        onBuyKeys={() => navigate({ page: 'paywall' })}
                    />
                </div>
            </div>

            <div class="screen-content space-y-6">
                {/* Continue reading */}
                {continueItem && (
                    <section>
                        <h2 class="text-lg font-semibold mb-3">📖 {t.home.continueReading}</h2>
                        <button
                            onClick={() => navigate({
                                page: 'reader',
                                seriesSlug: continueItem.seriesSlug,
                                episodeNumber: continueItem.episodeNumber
                            })}
                            class="w-full p-4 rounded-2xl bg-gradient-to-r from-primary-700/20 to-accent-500/20 border border-primary-700/30 text-left"
                        >
                            <div class="flex items-center gap-4">
                                <div class="w-16 h-20 rounded-lg bg-dark-card flex items-center justify-center text-2xl">
                                    💕
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-semibold truncate">{continueItem.seriesTitle}</p>
                                    <p class="text-sm text-gray-400">
                                        Ep. {continueItem.episodeNumber}: {continueItem.episodeTitle}
                                    </p>
                                    <p class="text-xs text-primary-400 mt-1">{t.home.continue} →</p>
                                </div>
                            </div>
                        </button>
                    </section>
                )}

                {/* For You (personalized) */}
                {recommendedSeries.length > 0 && (
                    <section>
                        <h2 class="text-lg font-semibold mb-3">✨ {t.home.title}</h2>
                        <div class="grid grid-cols-2 gap-3">
                            {recommendedSeries.slice(0, 4).map((series) => (
                                <SeriesCard
                                    key={series.id}
                                    series={series}
                                    onClick={() => navigate({ page: 'story', slug: series.slug })}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Series */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">📚 Todas as histórias</h2>
                    <div class="grid grid-cols-2 gap-3">
                        {allSeries.map((series) => (
                            <SeriesCard
                                key={series.id}
                                series={series}
                                onClick={() => navigate({ page: 'story', slug: series.slug })}
                            />
                        ))}
                    </div>
                </section>

                {/* Empty state */}
                {allSeries.length === 0 && !isLoading.value && (
                    <div class="text-center py-12">
                        <p class="text-4xl mb-4">📚</p>
                        <p class="text-gray-400">Nenhuma história disponível</p>
                        <button onClick={refreshData} class="btn-secondary mt-4">
                            {t.errors.tryAgain}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
