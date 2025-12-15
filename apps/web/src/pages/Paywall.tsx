import { useState } from 'preact/hooks';
import { navigate, currentUser, isLoading } from '../store';
import { createInvoice, mockCompletePayment } from '../api';
import { SKU_CATALOG } from '@tma-romance/shared';

interface PaywallScreenProps {
    seriesSlug?: string;
}

export function PaywallScreen({ seriesSlug }: PaywallScreenProps) {
    const [purchasing, setPurchasing] = useState<string | null>(null);

    const handlePurchase = async (sku: string) => {
        setPurchasing(sku);

        try {
            const result = await createInvoice(sku);

            if (result.mock) {
                // Development mode - simulate payment
                if (confirm('Modo de desenvolvimento. Simular pagamento bem-sucedido?')) {
                    await mockCompletePayment(result.paymentId);
                    alert('✅ Pagamento simulado com sucesso!');

                    // Navigate back
                    if (seriesSlug) {
                        navigate({ page: 'story', slug: seriesSlug });
                    } else {
                        navigate({ page: 'home' });
                    }
                }
            } else {
                // Real Telegram payment
                if (window.Telegram?.WebApp?.openInvoice) {
                    window.Telegram.WebApp.openInvoice(result.invoiceUrl, (status: string) => {
                        if (status === 'paid') {
                            // Payment successful
                            if (seriesSlug) {
                                navigate({ page: 'story', slug: seriesSlug });
                            } else {
                                navigate({ page: 'home' });
                            }
                        }
                    });
                } else {
                    alert('Telegram WebApp não disponível');
                }
            }
        } catch (err) {
            console.error('Purchase failed:', err);
            alert('Falha no pagamento. Tente novamente.');
        } finally {
            setPurchasing(null);
        }
    };

    return (
        <div class="screen">
            <div class="screen-header">
                <button
                    onClick={() => seriesSlug ? navigate({ page: 'story', slug: seriesSlug }) : navigate({ page: 'home' })}
                    class="text-gray-400 hover:text-white"
                >
                    ← Voltar
                </button>
            </div>

            <div class="screen-content space-y-6">
                {/* Hero */}
                <div class="text-center py-6">
                    <div class="text-5xl mb-4">💎</div>
                    <h1 class="text-title-lg">Desbloqueie Tudo</h1>
                    <p class="text-gray-400 mt-2">
                        Leia sem limites. Sem esperar. Rotas exclusivas.
                    </p>
                </div>

                {/* Keys packs */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">🔑 Pacotes de Chaves</h2>
                    <div class="space-y-3">
                        <PackCard
                            sku="keys_5"
                            title={SKU_CATALOG.keys_5.labelPt}
                            price={SKU_CATALOG.keys_5.stars}
                            description="5 chaves para ler agora"
                            onPurchase={handlePurchase}
                            isPurchasing={purchasing === 'keys_5'}
                        />
                        <PackCard
                            sku="keys_15"
                            title={SKU_CATALOG.keys_15.labelPt}
                            price={SKU_CATALOG.keys_15.stars}
                            description="15 chaves + melhor custo-benefício"
                            onPurchase={handlePurchase}
                            isPurchasing={purchasing === 'keys_15'}
                        />
                    </div>
                </section>

                {/* Subscriptions */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">⭐ Planos Mensais</h2>
                    <div class="space-y-3">
                        <SubscriptionCard
                            sku="sub_core"
                            title="Unlimited"
                            price={SKU_CATALOG.sub_core.stars}
                            features={[
                                '🔓 Chaves ilimitadas',
                                '⏩ Acesso antecipado +2 episódios',
                                '🔥 Cenas VIP semanais',
                            ]}
                            featured={true}
                            onPurchase={handlePurchase}
                            isPurchasing={purchasing === 'sub_core'}
                        />

                        <SubscriptionCard
                            sku="sub_vip"
                            title="VIP"
                            price={SKU_CATALOG.sub_vip.stars}
                            features={[
                                '🔓 Tudo do Unlimited',
                                '⏩ Acesso antecipado +5 episódios',
                                '👑 Rotas e finais VIP exclusivos',
                                '🎧 Versões em áudio (em breve)',
                            ]}
                            featured={false}
                            onPurchase={handlePurchase}
                            isPurchasing={purchasing === 'sub_vip'}
                        />
                    </div>
                </section>

                {/* Support link */}
                <div class="text-center text-sm text-gray-500">
                    <p>Problemas com pagamento?</p>
                    <button class="text-primary-400 underline">
                        Ajuda: /paysupport
                    </button>
                </div>
            </div>
        </div>
    );
}

interface PackCardProps {
    sku: string;
    title: string;
    price: number;
    description: string;
    onPurchase: (sku: string) => void;
    isPurchasing: boolean;
}

function PackCard({ sku, title, price, description, onPurchase, isPurchasing }: PackCardProps) {
    return (
        <button
            onClick={() => onPurchase(sku)}
            disabled={isPurchasing}
            class="paywall-card w-full text-left flex items-center justify-between"
        >
            <div>
                <p class="font-semibold">{title}</p>
                <p class="text-sm text-gray-400">{description}</p>
            </div>
            <div class="text-right">
                <p class="text-lg font-bold text-accent-500">{price} ⭐</p>
                {isPurchasing && <p class="text-xs text-gray-400">Processando…</p>}
            </div>
        </button>
    );
}

interface SubscriptionCardProps {
    sku: string;
    title: string;
    price: number;
    features: string[];
    featured: boolean;
    onPurchase: (sku: string) => void;
    isPurchasing: boolean;
}

function SubscriptionCard({ sku, title, price, features, featured, onPurchase, isPurchasing }: SubscriptionCardProps) {
    return (
        <div class={`paywall-card ${featured ? 'paywall-card-featured' : ''}`}>
            {featured && (
                <div class="text-xs text-primary-400 font-semibold mb-2">⭐ MAIS POPULAR</div>
            )}

            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-bold">{title}</h3>
                    <p class="text-sm text-gray-400">por mês</p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-accent-500">{price} ⭐</p>
                </div>
            </div>

            <ul class="space-y-2 mb-4">
                {features.map((feature, i) => (
                    <li key={i} class="text-sm text-gray-300">{feature}</li>
                ))}
            </ul>

            <button
                onClick={() => onPurchase(sku)}
                disabled={isPurchasing}
                class={featured ? 'btn-primary' : 'btn-secondary'}
            >
                {isPurchasing ? 'Processando…' : 'Assinar agora'}
            </button>
        </div>
    );
}
