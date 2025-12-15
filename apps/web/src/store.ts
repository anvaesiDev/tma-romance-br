import { signal, computed } from '@preact/signals';

// ==========================================
// Application State Store
// ==========================================

// Auth state
export const token = signal<string | null>(localStorage.getItem('token'));
export const isAuthenticated = computed(() => !!token.value);

export const currentUser = signal<{
    id: string;
    tgUserId: string;
    username?: string;
    displayName?: string;
    onboardingComplete: boolean;
    selectedTropes: string[];
    intensity: 'mild' | 'bold';
    keysBalance: number;
    hasUnlimited: boolean;
    hasVip: boolean;
} | null>(null);

// Navigation state
export type Route =
    | { page: 'loading' }
    | { page: 'onboarding' }
    | { page: 'home' }
    | { page: 'story'; slug: string }
    | { page: 'reader'; seriesSlug: string; episodeNumber: number }
    | { page: 'paywall'; seriesSlug?: string }
    | { page: 'settings' };

export const currentRoute = signal<Route>({ page: 'loading' });

// Series data
export const seriesList = signal<Array<{
    id: string;
    slug: string;
    titlePt: string;
    descriptionPt: string;
    coverAssetUrl?: string;
    tropePrimary: string;
    tropeSecondary?: string;
    tags: string[];
    episodeCount: number;
}>>([]);

// Progress data
export const progressList = signal<Array<{
    seriesId: string;
    seriesSlug: string;
    seriesTitle: string;
    seriesCover?: string;
    tropePrimary: string;
    episodeNumber: number;
    episodeTitle: string;
    sceneOrdinal: number;
    updatedAt: string;
}>>([]);

// Current episode for reader
export const currentEpisode = signal<{
    id: string;
    number: number;
    titlePt: string;
    seriesId: string;
    seriesSlug: string;
    seriesTitle: string;
    scenes: Array<{
        id: string;
        ordinal: number;
        type: string;
        payload: any;
    }>;
    requiresPayment?: boolean;
} | null>(null);

// Reader state
export const readerSceneIndex = signal(0);
export const readerRouteFlags = signal<Record<string, boolean>>({});
export const readerMeters = signal<Record<string, number>>({});

// UI state
export const isLoading = signal(false);
export const error = signal<string | null>(null);

// ==========================================
// Navigation
// ==========================================

export function navigate(route: Route) {
    currentRoute.value = route;
    // Reset error on navigation
    error.value = null;
}

// ==========================================
// Actions
// ==========================================

export function setToken(newToken: string | null) {
    token.value = newToken;
    if (newToken) {
        localStorage.setItem('token', newToken);
    } else {
        localStorage.removeItem('token');
    }
}

export function logout() {
    setToken(null);
    currentUser.value = null;
    navigate({ page: 'loading' });
}
