import { TROPES } from '@tma-romance/shared';

interface SeriesCardProps {
    series: {
        id: string;
        slug: string;
        titlePt: string;
        coverAssetUrl?: string;
        tropePrimary: string;
        episodeCount: number;
    };
    onClick: () => void;
}

export function SeriesCard({ series, onClick }: SeriesCardProps) {
    const trope = TROPES.find(t => t.id === series.tropePrimary);

    return (
        <button onClick={onClick} class="series-card text-left">
            {/* Cover */}
            <div class="aspect-[3/4] bg-gradient-to-br from-primary-700/30 to-accent-500/20 flex items-center justify-center text-4xl">
                {trope?.emoji || '💕'}
            </div>

            {/* Overlay with info */}
            <div class="series-card-overlay" />

            <div class="absolute bottom-0 left-0 right-0 p-3">
                <div class="h-10 flex flex-col justify-end">
                    <p class="font-semibold text-sm leading-tight line-clamp-2 w-full">
                        {series.titlePt}
                    </p>
                </div>
                <p class="text-xs text-gray-400 mt-1">
                    {series.episodeCount} ep. • {trope?.labelPt}
                </p>
            </div>
        </button>
    );
}
