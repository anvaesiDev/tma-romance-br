import { useEffect, useState, useRef } from 'preact/hooks';
import { navigate, isLoading, currentEpisode, readerRouteFlags, readerMeters, currentUser } from '../store';
import { fetchEpisode, saveProgress, completeEpisode } from '../api';
import { ChatBubble } from '../components/ChatBubble';
import { ChoiceButtons } from '../components/ChoiceButtons';
import { TypingIndicator } from '../components/TypingIndicator';

interface ReaderScreenProps {
    seriesSlug: string;
    episodeNumber: number;
}

export function ReaderScreen({ seriesSlug, episodeNumber }: ReaderScreenProps) {
    const [displayedScenes, setDisplayedScenes] = useState<number>(0);
    const [isTyping, setIsTyping] = useState(false);
    const [waitingForChoice, setWaitingForChoice] = useState(false);
    const [episodeComplete, setEpisodeComplete] = useState(false);
    const [nextEpisodeInfo, setNextEpisodeInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadEpisode();
        return () => {
            currentEpisode.value = null;
        };
    }, [seriesSlug, episodeNumber]);

    useEffect(() => {
        scrollToBottom();
    }, [displayedScenes, isTyping]);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const loadEpisode = async () => {
        isLoading.value = true;
        setDisplayedScenes(0);
        setWaitingForChoice(false);
        setEpisodeComplete(false);
        setNextEpisodeInfo(null);
        setError(null);

        try {
            await fetchEpisode(seriesSlug, episodeNumber);

            if (currentEpisode.value?.requiresPayment) {
                navigate({ page: 'paywall', seriesSlug });
                return;
            }
        } catch (err: any) {
            console.error('Failed to load episode:', err);
            setError(err.message || 'Ошибка загрузки');
        } finally {
            isLoading.value = false;
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleTap = () => {
        if (isTyping || waitingForChoice || episodeComplete) return;

        const scenes = currentEpisode.value?.scenes || [];

        if (displayedScenes >= scenes.length) {
            handleEpisodeComplete();
            return;
        }

        const nextScene = scenes[displayedScenes];

        // Choice - show immediately
        if (nextScene.type === 'choice') {
            setDisplayedScenes(prev => prev + 1);
            setWaitingForChoice(true);
            return;
        }

        // Notification - show as toast at top
        if (nextScene.type === 'system_card' && nextScene.payload.type === 'notification') {
            setToastMessage(nextScene.payload.text);
            setDisplayedScenes(prev => prev + 1);
            saveProgressQuietly();
            return;
        }

        // Show typing for chat messages
        if (nextScene.type === 'chat') {
            setIsTyping(true);
            const delay = Math.min(nextScene.payload.delayMs || 800, 1200);

            setTimeout(() => {
                setIsTyping(false);
                setDisplayedScenes(prev => prev + 1);
                saveProgressQuietly();
            }, delay);
        } else {
            // Other types - show immediately
            setDisplayedScenes(prev => prev + 1);
            saveProgressQuietly();
        }
    };

    const saveProgressQuietly = async () => {
        if (!currentEpisode.value) return;
        try {
            await saveProgress({
                seriesId: currentEpisode.value.seriesId,
                episodeId: currentEpisode.value.id,
                sceneOrdinal: displayedScenes,
                routeFlags: readerRouteFlags.value,
                meters: readerMeters.value,
            });
        } catch (err) {
            console.warn('Failed to save progress:', err);
        }
    };

    const handleChoice = (optionId: string, effects?: { routeFlags?: Record<string, boolean>; meters?: Record<string, number> }) => {
        if (effects?.routeFlags) {
            readerRouteFlags.value = { ...readerRouteFlags.value, ...effects.routeFlags };
        }
        if (effects?.meters) {
            Object.entries(effects.meters).forEach(([key, value]) => {
                readerMeters.value = {
                    ...readerMeters.value,
                    [key]: (readerMeters.value[key] || 0) + value
                };
            });
        }

        setWaitingForChoice(false);

        const scenes = currentEpisode.value?.scenes || [];
        if (displayedScenes >= scenes.length) {
            handleEpisodeComplete();
        }
    };

    const handleEpisodeComplete = async () => {
        if (!currentEpisode.value || episodeComplete) return;

        setEpisodeComplete(true);

        try {
            const result = await completeEpisode({
                seriesId: currentEpisode.value.seriesId,
                episodeId: currentEpisode.value.id,
                secondsSpent: 120,
            });

            setNextEpisodeInfo(result.nextEpisode);
        } catch (err) {
            console.error('Failed to complete episode:', err);
        }
    };

    const goToNextEpisode = () => {
        if (nextEpisodeInfo) {
            if (nextEpisodeInfo.isPaywalled && !currentUser.value?.hasUnlimited) {
                navigate({ page: 'paywall', seriesSlug });
            } else {
                navigate({ page: 'reader', seriesSlug, episodeNumber: nextEpisodeInfo.number });
            }
        }
    };

    const scenes = currentEpisode.value?.scenes || [];
    // Filter out notifications from visible scenes (they show as toast)
    const visibleScenes = scenes.slice(0, displayedScenes).filter(s =>
        !(s.type === 'system_card' && s.payload.type === 'notification')
    );
    const hasMoreScenes = displayedScenes < scenes.length;

    // Loading
    if (!currentEpisode.value && !error) {
        return (
            <div class="screen" style="display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; animation: pulse 1.5s infinite;">📖</div>
                    <p class="text-secondary" style="margin-top: 16px;">Загрузка…</p>
                </div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div class="screen" style="display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 48px;">❌</div>
                    <p class="text-secondary" style="margin-top: 16px;">{error}</p>
                    <button onClick={loadEpisode} class="btn-secondary" style="margin-top: 16px;">
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div class="screen" onClick={handleTap}>
            {/* Toast notification at top */}
            {toastMessage && (
                <div class="toast-container">
                    <div class="toast">
                        <div class="toast-icon">💬</div>
                        <div class="toast-content">
                            <p class="toast-title">Новое сообщение</p>
                            <p class="toast-text">{toastMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div class="screen-header" onClick={(e) => e.stopPropagation()}>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <button
                        onClick={() => navigate({ page: 'story', slug: seriesSlug })}
                        style="color: var(--text-muted); font-size: 14px;"
                    >
                        ← Назад
                    </button>

                    <div style="text-align: center;">
                        <p style="font-size: 14px; font-weight: 500;">{currentEpisode.value?.seriesTitle}</p>
                        <p style="font-size: 12px; color: var(--text-muted);">
                            Эп. {currentEpisode.value?.number}: {currentEpisode.value?.titlePt}
                        </p>
                    </div>

                    <div style="width: 48px;"></div>
                </div>
            </div>

            {/* Messages */}
            <div class="screen-content" style="padding-bottom: 100px;">
                <div class="chat-container">
                    {visibleScenes.map((scene) => renderScene(scene, handleChoice, waitingForChoice))}

                    {isTyping && <TypingIndicator />}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Footer */}
            <div class="screen-footer" onClick={(e) => e.stopPropagation()}>
                {waitingForChoice && (
                    <p style="text-align: center; font-size: 13px; color: var(--accent);">
                        ↑ Сделайте выбор
                    </p>
                )}

                {episodeComplete && (
                    <div>
                        <p style="text-align: center; font-size: 14px; font-weight: 500; margin-bottom: 12px;">
                            Эпизод завершён
                        </p>

                        {nextEpisodeInfo ? (
                            <button onClick={goToNextEpisode} class="btn-primary">
                                {nextEpisodeInfo.isPaywalled && !currentUser.value?.hasUnlimited
                                    ? 'Разблокировать следующий'
                                    : 'Следующий эпизод →'
                                }
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate({ page: 'story', slug: seriesSlug })}
                                class="btn-secondary"
                            >
                                Вернуться к истории
                            </button>
                        )}
                    </div>
                )}

                {!isTyping && !waitingForChoice && !episodeComplete && hasMoreScenes && (
                    <p style="text-align: center; font-size: 13px; color: var(--text-muted);">
                        Тапните для продолжения
                    </p>
                )}

                {isTyping && (
                    <p style="text-align: center; font-size: 13px; color: var(--text-muted);">
                        печатает...
                    </p>
                )}
            </div>
        </div>
    );
}

function renderScene(
    scene: { id: string; ordinal: number; type: string; payload: any },
    onChoice: (optionId: string, effects?: any) => void,
    waitingForChoice: boolean
) {
    switch (scene.type) {
        case 'chat':
            return (
                <ChatBubble
                    key={scene.id}
                    speakerName={scene.payload.speakerName}
                    text={scene.payload.text}
                    isProtagonist={scene.payload.isProtagonist}
                />
            );

        case 'system_card':
            // Document style
            if (scene.payload.type === 'document') {
                return (
                    <div key={scene.id} class="attachment">
                        <div class="attachment-inner">
                            <div class="attachment-header">
                                <div class="attachment-icon">📄</div>
                                <div class="attachment-info">
                                    <p class="attachment-name">Документ</p>
                                    <p class="attachment-size">текст</p>
                                </div>
                            </div>
                            <p class="attachment-content">"{scene.payload.text}"</p>
                        </div>
                    </div>
                );
            }

            // Default: narrator text (centered, subtle)
            return (
                <div key={scene.id} class="narrator">
                    {scene.payload.text}
                </div>
            );

        case 'image_card':
            return (
                <div key={scene.id} class="msg-image">
                    <div class="msg-image-inner">
                        <div class="msg-image-placeholder">📷</div>
                        {scene.payload.captionPt && (
                            <p class="msg-image-caption">{scene.payload.captionPt}</p>
                        )}
                    </div>
                </div>
            );

        case 'voice_card':
            return (
                <div key={scene.id} class="msg-voice">
                    <div class="msg-voice-inner">
                        <div class="voice-play">▶</div>
                        <div style="flex: 1;">
                            <div class="voice-bars">
                                {Array.from({ length: 28 }, (_, i) => (
                                    <div
                                        key={i}
                                        class="voice-bar"
                                        style={{ height: `${20 + Math.sin(i * 0.4) * 50 + 30}%` }}
                                    />
                                ))}
                            </div>
                            <p class="voice-meta">{scene.payload.speakerName} • 0:12</p>
                        </div>
                    </div>
                </div>
            );

        case 'choice':
            return (
                <div key={scene.id} onClick={(e) => e.stopPropagation()}>
                    <ChoiceButtons
                        options={scene.payload.options}
                        onChoice={onChoice}
                        disabled={!waitingForChoice}
                    />
                </div>
            );

        default:
            return null;
    }
}
