import { token, setToken, currentUser, navigate, seriesList, progressList, currentEpisode } from './store';

// ==========================================
// API Client
// ==========================================

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ApiError {
    error: string;
    details?: any;
}

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token.value) {
        headers['Authorization'] = `Bearer ${token.value}`;
    }

    const response = await fetch(`${API_BASE}/api${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// ==========================================
// Auth API
// ==========================================

export async function authenticateTelegram(): Promise<void> {
    // Get initData from Telegram WebApp
    let initData = '';

    if (window.Telegram?.WebApp?.initData) {
        initData = window.Telegram.WebApp.initData;
    } else {
        // Mock mode for development
        initData = 'mock_12345678';
        console.log('Using mock auth (no Telegram WebApp detected)');
    }

    const response = await fetchApi<{
        token: string;
        user: typeof currentUser.value;
    }>('/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ initData }),
    });

    setToken(response.token);
    currentUser.value = response.user;

    // Navigate based on onboarding status
    if (!response.user?.onboardingComplete) {
        navigate({ page: 'onboarding' });
    } else {
        navigate({ page: 'home' });
    }
}

// ==========================================
// User API
// ==========================================

export async function fetchCurrentUser(): Promise<void> {
    const response = await fetchApi<{ user: typeof currentUser.value }>('/users/me');
    currentUser.value = response.user;
}

export async function completeOnboarding(data: {
    selectedTropes: string[];
    intensity: 'mild' | 'bold';
    displayName?: string;
}): Promise<void> {
    const response = await fetchApi<{ user: Partial<typeof currentUser.value> }>('/users/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (currentUser.value) {
        currentUser.value = {
            ...currentUser.value,
            ...response.user,
            onboardingComplete: true,
        };
    }

    navigate({ page: 'home' });
}

export async function claimDailyKeys(): Promise<{
    keysGranted: number;
    newBalance: number;
    streakDays: number;
}> {
    const response = await fetchApi<{
        keysGranted: number;
        newBalance: number;
        streakDays: number;
    }>('/users/claim-daily-keys', {
        method: 'POST',
    });

    if (currentUser.value) {
        currentUser.value = {
            ...currentUser.value,
            keysBalance: response.newBalance,
        };
    }

    return response;
}

// ==========================================
// Series API
// ==========================================

export async function fetchSeriesList(tropes?: string[]): Promise<void> {
    const queryParams = tropes?.length ? `?tropes=${tropes.join(',')}` : '';
    const response = await fetchApi<{ series: typeof seriesList.value }>(`/series${queryParams}`);
    seriesList.value = response.series;
}

export async function fetchSeriesDetail(slug: string): Promise<{
    series: {
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
    };
}> {
    return fetchApi(`/series/${slug}`);
}

// ==========================================
// Progress API
// ==========================================

export async function fetchProgress(): Promise<void> {
    const response = await fetchApi<{ progress: typeof progressList.value }>('/progress');
    progressList.value = response.progress;
}

export async function saveProgress(data: {
    seriesId: string;
    episodeId: string;
    sceneOrdinal: number;
    routeFlags?: Record<string, boolean>;
    meters?: Record<string, number>;
}): Promise<void> {
    await fetchApi('/progress', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function completeEpisode(data: {
    seriesId: string;
    episodeId: string;
    secondsSpent: number;
}): Promise<{
    nextEpisode: {
        id: string;
        number: number;
        titlePt: string;
        isPaywalled: boolean;
    } | null;
}> {
    return fetchApi('/progress/complete-episode', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ==========================================
// Episode API
// ==========================================

export async function fetchEpisode(seriesSlug: string, episodeNumber: number): Promise<void> {
    const response = await fetchApi<{
        episode: typeof currentEpisode.value;
    }>(`/episodes/by-number/${seriesSlug}/${episodeNumber}`);

    currentEpisode.value = response.episode;
}

// ==========================================
// Payments API
// ==========================================

export async function createInvoice(sku: string): Promise<{
    invoiceUrl: string;
    paymentId: string;
    mock?: boolean;
}> {
    return fetchApi('/payments/create-invoice', {
        method: 'POST',
        body: JSON.stringify({ sku }),
    });
}

export async function mockCompletePayment(paymentId: string): Promise<void> {
    await fetchApi('/payments/mock-complete', {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
    });

    // Refresh user data to get updated entitlements
    await fetchCurrentUser();
}

export async function fetchEntitlements(): Promise<{
    entitlements: Array<{ id: string; type: string; startsAt: string; endsAt?: string }>;
    keysBalance: number;
    hasUnlimited: boolean;
    hasVip: boolean;
}> {
    return fetchApi('/payments/entitlements');
}
