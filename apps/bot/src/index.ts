import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';

// ==========================================
// TMA Romance BR Bot
// ==========================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-webapp-url.com';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || 'dev-secret';

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required');
    console.log('Set BOT_TOKEN in .env file or environment');
    process.exit(1);
}

// Create bot instance
const bot = new Bot(BOT_TOKEN);

// ==========================================
// Command Handlers
// ==========================================

/**
 * /start - Welcome message with Mini App button
 * Supports deep links: /start src_<sourceId>_series_<slug>
 */
bot.command('start', async (ctx) => {
    const startParam = ctx.match;

    // Build Mini App URL with start param
    let webAppUrl = WEBAPP_URL;
    if (startParam) {
        webAppUrl = `${WEBAPP_URL}?startapp=${encodeURIComponent(startParam)}`;
    }

    const keyboard = new InlineKeyboard()
        .webApp('💕 Abrir histórias', webAppUrl);

    await ctx.reply(
        `🌹 *Romance Interativo*\n\n` +
        `Histórias que você escolhe. 2 minutos por episódio.\n\n` +
        `👇 Toque para começar`,
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

/**
 * /paysupport - Payment support
 */
bot.command('paysupport', async (ctx) => {
    await ctx.reply(
        `💬 *Suporte de Pagamento*\n\n` +
        `Se você teve algum problema com pagamento, por favor nos envie:\n\n` +
        `1️⃣ Seu ID de usuário: \`${ctx.from?.id}\`\n` +
        `2️⃣ Data aproximada do pagamento\n` +
        `3️⃣ Descrição do problema\n\n` +
        `Responderemos em até 24 horas.`,
        { parse_mode: 'Markdown' }
    );
});

/**
 * /help - Help message
 */
bot.command('help', async (ctx) => {
    const keyboard = new InlineKeyboard()
        .webApp('💕 Abrir app', WEBAPP_URL);

    await ctx.reply(
        `📖 *Como usar*\n\n` +
        `1. Toque em "Abrir histórias"\n` +
        `2. Escolha seus temas favoritos\n` +
        `3. Comece a ler e faça escolhas\n` +
        `4. Desbloqueie mais histórias com ⭐ Stars\n\n` +
        `*Comandos:*\n` +
        `/start - Abrir o app\n` +
        `/paysupport - Suporte de pagamento\n` +
        `/help - Esta mensagem`,
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

// ==========================================
// Payment Handlers
// ==========================================

/**
 * Pre-checkout query - validate before payment
 */
bot.on('pre_checkout_query', async (ctx) => {
    // Always approve (validation happens server-side)
    await ctx.answerPreCheckoutQuery(true);
});

/**
 * Successful payment - grant entitlement
 */
bot.on('message:successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;

    console.log('💰 Payment received:', {
        invoicePayload: payment.invoice_payload,
        totalAmount: payment.total_amount,
        telegramChargeId: payment.telegram_payment_charge_id,
    });

    // Notify API about successful payment
    try {
        await fetch(`${API_URL}/api/payments/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET,
            },
            body: JSON.stringify({
                invoicePayload: payment.invoice_payload,
                telegramChargeId: payment.telegram_payment_charge_id,
                providerPaymentId: payment.provider_payment_charge_id,
                totalAmount: payment.total_amount,
                userId: ctx.from?.id?.toString(),
            }),
        });
    } catch (err) {
        console.error('Failed to notify API:', err);
    }

    // Send confirmation to user
    await ctx.reply(
        `✅ *Pagamento confirmado!*\n\n` +
        `Obrigado pela sua compra. Seu acesso foi atualizado.\n\n` +
        `💕 Continue lendo no app!`,
        { parse_mode: 'Markdown' }
    );
});

// ==========================================
// Error Handler
// ==========================================

bot.catch((err) => {
    console.error('Bot error:', err);
});

// ==========================================
// Start Bot (Polling mode for development)
// ==========================================

console.log('🤖 TMA Romance BR Bot starting (polling mode)');
bot.start();

export { bot };
