// ==========================================
// PT-BR Internationalization
// ==========================================

export const ptBR = {
    // Onboarding
    onboarding: {
        step1Title: '💕 O que você quer ler?',
        step2Title: '🔥 Qual intensidade?',
        step3Title: '✨ Como te chamar?',
        step1Subtitle: 'Escolha até 3 gêneros favoritos',
        step2Subtitle: 'Escolha o nível de romance',
        step3Subtitle: 'Opcional: como te chamar nas histórias?',
        step3Placeholder: 'Seu nome (ou apelido)',
        step3Hint: 'Pode pular ou mudar depois nas configurações',
        btnBack: 'Voltar',
        btnNext: 'Continuar',
        btnStart: 'Começar a ler',
        btnSaving: 'Salvando...',
    },

    // Intensity levels
    intensity: {
        mild: {
            title: 'Suave',
            description: 'Romance doce, tensão emocional, beijos',
        },
        bold: {
            title: 'Intenso',
            description: 'Química forte, cenas apaixonadas (sem conteúdo explícito)',
        },
    },

    // Home screen
    home: {
        title: 'Para você',
        continueReading: 'Continuar lendo',
        newStories: 'Novas histórias',
        episodesCount: (n: number) => `${n} episódios`,
        minutesRead: (n: number) => `${n} min`,
        startReading: 'Começar',
        continue: 'Continuar',
        keysBalance: 'chaves',
    },

    // Reader
    reader: {
        episode: 'Episódio',
        complete: 'Episódio concluído!',
        nextEpisode: 'Próximo episódio',
        backToStory: 'Voltar para a história',
        unlockWithKey: 'Usar 1 chave para continuar',
        noKeys: 'Sem chaves disponíveis',
        getMoreKeys: 'Conseguir mais chaves',
    },

    // Paywall
    paywall: {
        title: 'Continuar lendo',
        subtitle: 'Escolha como desbloquear',
        keysTitle: 'Chaves',
        keysDesc: 'Para desbloquear episódios',
        unlimitedTitle: 'Unlimited',
        unlimitedDesc: 'Leitura ilimitada por 30 dias',
        vipTitle: 'VIP',
        vipDesc: 'Tudo do Unlimited + rotas exclusivas',
        buyNow: 'Comprar agora',
        mostPopular: 'Mais popular',
        bestValue: 'Melhor custo-benefício',
        securePurchase: '🔒 Compra segura',
        support: 'Suporte: /paysupport',
        howToBuy: 'Como comprar Estrelas',
        howToBuyDesc: 'Você pode recarregar com Pix via Google Play',
    },

    // Settings
    settings: {
        title: 'Configurações',
        displayName: 'Nome de exibição',
        preferences: 'Preferências',
        tropes: 'Gêneros favoritos',
        intensity: 'Intensidade',
        account: 'Conta',
        logout: 'Sair',
        save: 'Salvar',
        saved: 'Salvo!',
    },

    // Errors
    errors: {
        generic: 'Ops! Algo deu errado...',
        networkError: 'Erro de conexão. Verifique sua internet.',
        tryAgain: 'Tentar novamente',
        goBack: 'Voltar',
        notFound: 'Não encontrado',
        unauthorized: 'Acesso não autorizado',
        paymentFailed: 'Pagamento falhou',
        noKeys: 'Você não tem chaves suficientes',
    },

    // Common
    common: {
        loading: 'Carregando...',
        stars: 'Estrelas',
        keys: 'Chaves',
        free: 'Grátis',
        day: 'dia',
        days: 'dias',
    },
};

// Translation helper function
export function t(key: string): string {
    const keys = key.split('.');
    let value: any = ptBR;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Missing translation: ${key}`);
            return key;
        }
    }

    if (typeof value === 'string') {
        return value;
    }

    console.warn(`Invalid translation key: ${key}`);
    return key;
}

export type TranslationKeys = typeof ptBR;
