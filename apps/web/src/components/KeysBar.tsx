interface KeysBarProps {
    balance: number;
    hasUnlimited: boolean;
    onClaimDaily?: () => void;
    onBuyKeys?: () => void;
}

export function KeysBar({ balance, hasUnlimited, onClaimDaily, onBuyKeys }: KeysBarProps) {
    if (hasUnlimited) {
        return (
            <div class="keys-bar justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-lg">⭐</span>
                    <span class="font-medium text-accent-400">Безлимит</span>
                </div>
                <span class="text-xs text-gray-400">Читайте без ограничений</span>
            </div>
        );
    }

    return (
        <div class="keys-bar justify-between">
            <div class="flex items-center gap-2">
                <span class="text-lg">🔑</span>
                <span class="font-medium">{balance} ключей</span>
            </div>

            <div class="flex gap-2">
                {onClaimDaily && (
                    <button
                        onClick={onClaimDaily}
                        class="text-xs px-3 py-1 rounded-full bg-primary-700/30 hover:bg-primary-700/50 transition-colors"
                    >
                        +Бесплатно
                    </button>
                )}

                {onBuyKeys && (
                    <button
                        onClick={onBuyKeys}
                        class="text-xs px-3 py-1 rounded-full bg-accent-500 hover:bg-accent-600 transition-colors font-medium"
                    >
                        Купить
                    </button>
                )}
            </div>
        </div>
    );
}
