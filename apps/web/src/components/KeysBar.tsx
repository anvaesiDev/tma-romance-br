import { ptBR } from '@tma-romance/shared';

const t = ptBR;

interface KeysBarProps {
    balance: number;
    hasUnlimited: boolean;
    onClaimDaily?: () => void;
    onBuyKeys?: () => void;
}

export function KeysBar({ balance, hasUnlimited, onClaimDaily, onBuyKeys }: KeysBarProps) {
    if (hasUnlimited) {
        return (
            <div class="keys-bar justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-lg">⭐</span>
                    <span class="font-medium text-accent-400">{t.paywall.unlimitedTitle}</span>
                </div>
                <span class="text-xs text-gray-400">{t.paywall.unlimitedDesc}</span>
            </div>
        );
    }

    return (
        <div class="keys-bar justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-lg">🔑</span>
                <span class="font-medium">{balance} {t.common.keys.toLowerCase()}</span>
            </div>

            <div class="flex gap-2">
                {onClaimDaily && (
                    <button
                        onClick={onClaimDaily}
                        class="text-xs px-3 py-1 rounded-full bg-primary-700/30 hover:bg-primary-700/50 transition-colors"
                    >
                        +{t.common.free}
                    </button>
                )}

                {onBuyKeys && (
                    <button
                        onClick={onBuyKeys}
                        class="text-xs px-3 py-1 rounded-full bg-accent-500 hover:bg-accent-600 transition-colors font-medium"
                    >
                        {t.paywall.buyNow.split(' ')[0]}
                    </button>
                )}
            </div>
        </div>
    );
}
