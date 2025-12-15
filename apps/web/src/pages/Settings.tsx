import { currentUser, navigate, logout } from '../store';

export function SettingsScreen() {
    const user = currentUser.value;

    return (
        <div class="screen">
            <div class="screen-header">
                <div class="flex items-center justify-between">
                    <button
                        onClick={() => navigate({ page: 'home' })}
                        class="text-gray-400 hover:text-white"
                    >
                        ← Voltar
                    </button>
                    <h1 class="text-lg font-semibold">Configurações</h1>
                    <div class="w-16"></div>
                </div>
            </div>

            <div class="screen-content space-y-6">
                {/* Profile section */}
                <section class="bg-dark-card rounded-2xl p-4 border border-dark-border">
                    <h2 class="text-sm text-gray-400 mb-3">Perfil</h2>

                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-300">Nome</span>
                            <span class="font-medium">{user?.displayName || 'Não definido'}</span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-gray-300">Temas favoritos</span>
                            <span class="text-sm text-gray-400">
                                {user?.selectedTropes.length || 0} selecionados
                            </span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-gray-300">Intensidade</span>
                            <span class="font-medium">
                                {user?.intensity === 'bold' ? '🔥 Intenso' : '🌸 Suave'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Subscription section */}
                <section class="bg-dark-card rounded-2xl p-4 border border-dark-border">
                    <h2 class="text-sm text-gray-400 mb-3">Plano</h2>

                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-medium">
                                {user?.hasVip ? '👑 VIP' : user?.hasUnlimited ? '⭐ Unlimited' : '🆓 Gratuito'}
                            </p>
                            <p class="text-sm text-gray-400">
                                {user?.hasUnlimited ? 'Chaves ilimitadas' : `${user?.keysBalance || 0} chaves`}
                            </p>
                        </div>

                        {!user?.hasUnlimited && (
                            <button
                                onClick={() => navigate({ page: 'paywall' })}
                                class="px-4 py-2 rounded-xl bg-primary-700 text-sm font-medium"
                            >
                                Fazer upgrade
                            </button>
                        )}
                    </div>
                </section>

                {/* Notifications */}
                <section class="bg-dark-card rounded-2xl p-4 border border-dark-border">
                    <h2 class="text-sm text-gray-400 mb-3">Notificações</h2>

                    <label class="flex justify-between items-center cursor-pointer">
                        <span class="text-gray-300">Novos episódios</span>
                        <input
                            type="checkbox"
                            defaultChecked
                            class="w-5 h-5 rounded bg-dark-border border-0 text-primary-700 focus:ring-primary-700"
                        />
                    </label>
                </section>

                {/* Support */}
                <section class="bg-dark-card rounded-2xl p-4 border border-dark-border">
                    <h2 class="text-sm text-gray-400 mb-3">Suporte</h2>

                    <div class="space-y-3">
                        <a href="#" class="flex items-center justify-between py-2 hover:text-primary-400">
                            <span>Ajuda com pagamentos</span>
                            <span class="text-gray-500">→</span>
                        </a>

                        <a href="#" class="flex items-center justify-between py-2 hover:text-primary-400">
                            <span>Termos de uso</span>
                            <span class="text-gray-500">→</span>
                        </a>

                        <a href="#" class="flex items-center justify-between py-2 hover:text-primary-400">
                            <span>Política de privacidade</span>
                            <span class="text-gray-500">→</span>
                        </a>
                    </div>
                </section>

                {/* Danger zone */}
                <section class="space-y-3">
                    <button
                        onClick={logout}
                        class="w-full py-3 text-center text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10"
                    >
                        Sair da conta
                    </button>

                    <button class="w-full py-3 text-center text-gray-500 text-sm hover:text-gray-400">
                        Excluir meus dados
                    </button>
                </section>

                {/* Version */}
                <p class="text-center text-xs text-gray-600">
                    TMA Romance BR v0.1.0
                </p>
            </div>
        </div>
    );
}
