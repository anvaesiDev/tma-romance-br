// Telegram WebApp types
declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                initData: string;
                initDataUnsafe: {
                    user?: {
                        id: number;
                        first_name: string;
                        last_name?: string;
                        username?: string;
                        language_code?: string;
                    };
                    start_param?: string;
                };
                ready: () => void;
                expand: () => void;
                close: () => void;
                openInvoice: (url: string, callback?: (status: string) => void) => void;
                themeParams: {
                    bg_color?: string;
                    text_color?: string;
                    hint_color?: string;
                    link_color?: string;
                    button_color?: string;
                    button_text_color?: string;
                };
                colorScheme: 'light' | 'dark';
                viewportHeight: number;
                viewportStableHeight: number;
                isExpanded: boolean;
                MainButton: {
                    text: string;
                    color: string;
                    textColor: string;
                    isVisible: boolean;
                    isActive: boolean;
                    isProgressVisible: boolean;
                    show: () => void;
                    hide: () => void;
                    enable: () => void;
                    disable: () => void;
                    showProgress: (leaveActive?: boolean) => void;
                    hideProgress: () => void;
                    onClick: (callback: () => void) => void;
                    offClick: (callback: () => void) => void;
                    setText: (text: string) => void;
                };
                BackButton: {
                    isVisible: boolean;
                    show: () => void;
                    hide: () => void;
                    onClick: (callback: () => void) => void;
                    offClick: (callback: () => void) => void;
                };
            };
        };
    }
}

export { };
