// ==========================================
// Core Domain Types for TMA Romance BR
// ==========================================

// ---- User ----
export interface User {
    id: string;
    tgUserId: bigint;
    username?: string;
    locale: string;
    createdAt: Date;
    lastSeenAt: Date;
    onboardingComplete: boolean;
    selectedTropes: string[];
    intensity: 'mild' | 'bold';
    displayName?: string;
    marketingSourceFirst?: string;
    marketingSourceLast?: string;
}

// ---- Series ----
export type MaturityLevel = 'SFW' | 'BOLD';
export type SeriesStatus = 'draft' | 'published';

export interface Series {
    id: string;
    slug: string;
    titlePt: string;
    descriptionPt: string;
    coverAssetUrl?: string;
    tropePrimary: string;
    tropeSecondary?: string;
    maturityLevel: MaturityLevel;
    status: SeriesStatus;
    tags: string[];
    episodeCount: number;
    estimatedMinutes: number;
}

// ---- Episode ----
export type EpisodeStatus = 'draft' | 'published';

export interface Episode {
    id: string;
    seriesId: string;
    number: number;
    titlePt: string;
    status: EpisodeStatus;
    releaseAt?: Date;
    estimatedSeconds: number;
    isPaywalled: boolean;
}

// ---- Scene ----
export type SceneType =
    | 'chat'
    | 'message_card'
    | 'voice_card'
    | 'image_card'
    | 'system_card'
    | 'choice';

export interface Scene {
    id: string;
    episodeId: string;
    ordinal: number;
    type: SceneType;
    payload: ScenePayload;
}

// Scene Payloads
export interface ChatPayload {
    speakerId: string;
    speakerName: string;
    text: string;
    delayMs: number;
    mood?: string;
    isProtagonist?: boolean;
}

export interface VoiceCardPayload {
    audioAssetUrl: string;
    transcriptPt: string;
    durationS: number;
    speakerName: string;
}

export interface ImageCardPayload {
    imageAssetUrl: string;
    captionPt?: string;
}

export interface SystemCardPayload {
    text: string;
    type: 'narrator' | 'notification' | 'document';
}

export interface ChoicePayload {
    options: ChoiceOption[];
}

export interface ChoiceOption {
    id: string;
    labelPt: string;
    nextSceneId?: string;
    effects?: {
        routeFlags?: Record<string, boolean>;
        meters?: Record<string, number>;
    };
}

export type ScenePayload =
    | ChatPayload
    | VoiceCardPayload
    | ImageCardPayload
    | SystemCardPayload
    | ChoicePayload;

// ---- Progress ----
export interface Progress {
    userId: string;
    seriesId: string;
    episodeId: string;
    sceneId: string;
    routeFlags: Record<string, boolean>;
    meters: Record<string, number>;
    updatedAt: Date;
}

// ---- Entitlements ----
export type EntitlementType = 'sub_core' | 'sub_vip' | 'keys_pack' | 'season_pass';
export type EntitlementStatus = 'active' | 'expired' | 'revoked';

export interface Entitlement {
    id: string;
    userId: string;
    type: EntitlementType;
    startsAt: Date;
    endsAt?: Date;
    status: EntitlementStatus;
}

// ---- Keys/Energy ----
export interface KeysBalance {
    userId: string;
    balance: number;
    dailyKeysClaimedAt?: Date;
    streakDays: number;
}

// ---- Payments ----
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Payment {
    id: string;
    userId: string;
    starsAmount: number;
    sku: string;
    status: PaymentStatus;
    telegramChargeId?: string;
    createdAt: Date;
    paidAt?: Date;
}

// ---- SKU Definitions ----
export const SKU_CATALOG = {
    // Keys packs (consumables)
    keys_5: { stars: 150, keys: 5, labelPt: 'Só mais um capítulo' },
    keys_15: { stars: 350, keys: 15, labelPt: 'Pacote Médio' },
    keys_40: { stars: 750, keys: 40, labelPt: 'Pacote Grande' },

    // Subscriptions
    sub_core: { stars: 500, labelPt: 'Unlimited', features: ['unlimited_keys', 'early_access_2'] },
    sub_vip: { stars: 1000, labelPt: 'VIP', features: ['unlimited_keys', 'early_access_5', 'vip_routes'] },

    // Entry tier
    sub_entry: { stars: 250, labelPt: 'Básico', features: ['daily_keys_6'] },
} as const;

export type SkuId = keyof typeof SKU_CATALOG;

// ---- Tropes ----
export const TROPES = [
    { id: 'contract', labelPt: 'Casamento por Contrato', labelRu: 'Брак по контракту', emoji: '💍' },
    { id: 'ceo', labelPt: 'CEO / Bilionário', labelRu: 'CEO / Миллиардер', emoji: '💼' },
    { id: 'mafia', labelPt: 'Máfia / Protetor', labelRu: 'Мафия / Защитник', emoji: '🔫' },
    { id: 'secret_identity', labelPt: 'Identidade Secreta', labelRu: 'Тайная личность', emoji: '🎭' },
    { id: 'revenge', labelPt: 'Vingança', labelRu: 'Месть', emoji: '⚔️' },
    { id: 'academy', labelPt: 'Academia / Fantasia', labelRu: 'Академия / Фэнтези', emoji: '🏰' },
    { id: 'second_chance', labelPt: 'Segunda Chance', labelRu: 'Второй шанс', emoji: '💔' },
    { id: 'fake_relationship', labelPt: 'Relacionamento Falso', labelRu: 'Фиктивные отношения', emoji: '💋' },
    { id: 'celebrity', labelPt: 'Celebridade', labelRu: 'Знаменитость', emoji: '⭐' },
    { id: 'lost_heiress', labelPt: 'Herdeira Perdida', labelRu: 'Потерянная наследница', emoji: '👑' },
] as const;

export type TropeId = typeof TROPES[number]['id'];

// ---- API Types ----
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface AuthPayload {
    initData: string;
}

export interface SessionToken {
    userId: string;
    tgUserId: string;
    exp: number;
}

// ---- Analytics Events ----
export type AnalyticsEvent =
    | { event: 'miniapp_open'; source?: string }
    | { event: 'onboarding_complete'; tropes: string[]; intensity: string }
    | { event: 'episode_start'; seriesId: string; episodeId: string }
    | { event: 'episode_complete'; seriesId: string; episodeId: string; secondsSpent: number }
    | { event: 'choice_made'; choiceId: string; optionId: string }
    | { event: 'paywall_view'; sku: string }
    | { event: 'purchase_start'; sku: string }
    | { event: 'purchase_success'; sku: string; starsAmount: number };
