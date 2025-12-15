import { useState } from 'preact/hooks';
import { TROPES, ptBR } from '@tma-romance/shared';
import { completeOnboarding } from '../api';
import { isLoading } from '../store';

const t = ptBR;

export function OnboardingScreen() {
    const [step, setStep] = useState(0);
    const [selectedTropes, setSelectedTropes] = useState<string[]>([]);
    const [intensity, setIntensity] = useState<'mild' | 'bold'>('mild');
    const [displayName, setDisplayName] = useState('');

    const handleTropeToggle = (tropeId: string) => {
        if (selectedTropes.includes(tropeId)) {
            setSelectedTropes(selectedTropes.filter(t => t !== tropeId));
        } else if (selectedTropes.length < 3) {
            setSelectedTropes([...selectedTropes, tropeId]);
        }
    };

    const handleComplete = async () => {
        isLoading.value = true;
        try {
            await completeOnboarding({
                selectedTropes,
                intensity,
                displayName: displayName.trim() || undefined,
            });
        } catch (err) {
            console.error('Onboarding failed:', err);
        } finally {
            isLoading.value = false;
        }
    };

    return (
        <div class="screen">
            <div class="screen-header">
                <div class="flex items-center justify-between">
                    <h1 class="text-lg font-semibold">
                        {step === 0 && t.onboarding.step1Title}
                        {step === 1 && t.onboarding.step2Title}
                        {step === 2 && t.onboarding.step3Title}
                    </h1>
                    <span class="text-sm text-gray-400">{step + 1}/3</span>
                </div>

                {/* Progress bar */}
                <div class="mt-3 h-1 bg-dark-border rounded-full overflow-hidden">
                    <div
                        class="h-full bg-gradient-to-r from-primary-700 to-accent-500 transition-all duration-300"
                        style={{ width: `${((step + 1) / 3) * 100}%` }}
                    />
                </div>
            </div>

            <div class="screen-content">
                {step === 0 && (
                    <div class="space-y-4">
                        <p class="text-gray-400 text-sm">{t.onboarding.step1Subtitle}</p>
                        <div class="grid grid-cols-2 gap-3">
                            {TROPES.map((trope) => (
                                <button
                                    key={trope.id}
                                    onClick={() => handleTropeToggle(trope.id)}
                                    class={`p-4 rounded-xl text-left transition-all ${selectedTropes.includes(trope.id)
                                        ? 'bg-primary-700 border-2 border-primary-600'
                                        : 'bg-dark-card border-2 border-dark-border hover:border-primary-700/50'
                                        }`}
                                >
                                    <span class="text-2xl block mb-2">{trope.emoji}</span>
                                    <span class="text-sm font-medium">{trope.labelPt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div class="space-y-4">
                        <p class="text-gray-400 text-sm">{t.onboarding.step2Subtitle}</p>
                        <div class="space-y-3">
                            <button
                                onClick={() => setIntensity('mild')}
                                class={`w-full p-5 rounded-xl text-left transition-all ${intensity === 'mild'
                                    ? 'bg-primary-700 border-2 border-primary-600'
                                    : 'bg-dark-card border-2 border-dark-border'
                                    }`}
                            >
                                <span class="text-2xl block mb-2">🌸</span>
                                <span class="font-semibold block">{t.intensity.mild.title}</span>
                                <span class="text-sm text-gray-400 mt-1 block">
                                    {t.intensity.mild.description}
                                </span>
                            </button>

                            <button
                                onClick={() => setIntensity('bold')}
                                class={`w-full p-5 rounded-xl text-left transition-all ${intensity === 'bold'
                                    ? 'bg-primary-700 border-2 border-primary-600'
                                    : 'bg-dark-card border-2 border-dark-border'
                                    }`}
                            >
                                <span class="text-2xl block mb-2">🔥</span>
                                <span class="font-semibold block">{t.intensity.bold.title}</span>
                                <span class="text-sm text-gray-400 mt-1 block">
                                    {t.intensity.bold.description}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div class="space-y-4">
                        <p class="text-gray-400 text-sm">
                            {t.onboarding.step3Subtitle}
                        </p>
                        <input
                            type="text"
                            placeholder={t.onboarding.step3Placeholder}
                            value={displayName}
                            onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                            class="input-field"
                            maxLength={50}
                        />
                        <p class="text-xs text-gray-500">
                            {t.onboarding.step3Hint}
                        </p>
                    </div>
                )}
            </div>

            <div class="screen-footer">
                <div class="flex gap-3">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            class="btn-secondary flex-1"
                        >
                            {t.onboarding.btnBack}
                        </button>
                    )}

                    {step < 2 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 0 && selectedTropes.length === 0}
                            class="btn-primary flex-1"
                        >
                            {t.onboarding.btnNext}
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={isLoading.value}
                            class="btn-primary flex-1"
                        >
                            {isLoading.value ? t.onboarding.btnSaving : t.onboarding.btnStart}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
