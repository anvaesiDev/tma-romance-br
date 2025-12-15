interface ChoiceOption {
    id: string;
    labelPt: string;
    effects?: {
        routeFlags?: Record<string, boolean>;
        meters?: Record<string, number>;
    };
}

interface ChoiceButtonsProps {
    options: ChoiceOption[];
    onChoice: (optionId: string, effects?: ChoiceOption['effects']) => void;
    disabled?: boolean;
}

export function ChoiceButtons({ options, onChoice, disabled }: ChoiceButtonsProps) {
    return (
        <div class="choices">
            <div class="choice-label">Ваш выбор</div>
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => !disabled && onChoice(option.id, option.effects)}
                    class="choice-btn"
                    disabled={disabled}
                >
                    {option.labelPt}
                </button>
            ))}
        </div>
    );
}
