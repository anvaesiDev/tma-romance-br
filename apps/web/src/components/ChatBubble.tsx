interface ChatBubbleProps {
    speakerName: string;
    text: string;
    isProtagonist?: boolean;
    mood?: string;
}

export function ChatBubble({ speakerName, text, isProtagonist }: ChatBubbleProps) {
    // No mood display - keep it clean
    return (
        <div class={`msg ${isProtagonist ? 'msg-out' : 'msg-in'}`}>
            {!isProtagonist && (
                <div class="msg-name">{speakerName}</div>
            )}
            <div class="msg-bubble">{text}</div>
        </div>
    );
}
