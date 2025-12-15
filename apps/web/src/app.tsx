import { useEffect } from 'preact/hooks';
import { currentRoute, isLoading, error, currentUser, navigate } from './store';
import { authenticateTelegram, fetchSeriesList, fetchProgress } from './api';

// Pages
import { LoadingScreen } from './pages/Loading';
import { OnboardingScreen } from './pages/Onboarding';
import { HomeScreen } from './pages/Home';
import { StoryScreen } from './pages/Story';
import { ReaderScreen } from './pages/Reader';
import { PaywallScreen } from './pages/Paywall';
import { SettingsScreen } from './pages/Settings';

export function App() {
    // Initialize app on mount
    useEffect(() => {
        initializeApp();

        // Initialize Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
    }, []);

    // Manage Telegram BackButton visibility based on current route
    useEffect(() => {
        const route = currentRoute.value;
        const backButton = window.Telegram?.WebApp?.BackButton;

        if (!backButton) return;

        // Show BackButton on all pages except home/loading
        const shouldShowBack = route.page !== 'home' && route.page !== 'loading';

        if (shouldShowBack) {
            backButton.show();
        } else {
            backButton.hide();
        }

        // Handle BackButton click
        const handleBack = () => {
            switch (route.page) {
                case 'onboarding':
                    // Can't go back from onboarding
                    break;
                case 'story':
                    navigate({ page: 'home' });
                    break;
                case 'reader':
                    navigate({ page: 'story', slug: route.seriesSlug });
                    break;
                case 'paywall':
                    if (route.seriesSlug) {
                        navigate({ page: 'story', slug: route.seriesSlug });
                    } else {
                        navigate({ page: 'home' });
                    }
                    break;
                case 'settings':
                    navigate({ page: 'home' });
                    break;
                default:
                    navigate({ page: 'home' });
            }
        };

        backButton.onClick(handleBack);

        return () => {
            backButton.offClick(handleBack);
        };
    }, [currentRoute.value]);

    return (
        <div class="screen">
            {error.value && (
                <div class="fixed top-4 left-4 right-4 z-50 p-4 bg-red-500/90 text-white rounded-xl animate-slide-up">
                    <p class="text-sm">{error.value}</p>
                    <button
                        onClick={() => error.value = null}
                        class="mt-2 text-xs underline"
                    >
                        Fechar
                    </button>
                </div>
            )}

            <Router />
        </div>
    );
}

function Router() {
    const route = currentRoute.value;

    switch (route.page) {
        case 'loading':
            return <LoadingScreen />;
        case 'onboarding':
            return <OnboardingScreen />;
        case 'home':
            return <HomeScreen />;
        case 'story':
            return <StoryScreen slug={route.slug} />;
        case 'reader':
            return <ReaderScreen seriesSlug={route.seriesSlug} episodeNumber={route.episodeNumber} />;
        case 'paywall':
            return <PaywallScreen seriesSlug={route.seriesSlug} />;
        case 'settings':
            return <SettingsScreen />;
        default:
            return <LoadingScreen />;
    }
}

async function initializeApp() {
    isLoading.value = true;

    try {
        // Authenticate with Telegram
        await authenticateTelegram();

        // If authenticated and onboarding complete, load data
        if (currentUser.value?.onboardingComplete) {
            await Promise.all([
                fetchSeriesList(currentUser.value.selectedTropes),
                fetchProgress(),
            ]);
        }
    } catch (err) {
        console.error('Failed to initialize app:', err);
        error.value = 'Erro ao carregar. Tente novamente.';
    } finally {
        isLoading.value = false;
    }
}
