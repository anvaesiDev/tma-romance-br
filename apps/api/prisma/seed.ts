import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// Seed Data for 5 Pilot Series
// Based on BR_Pilots_ReelShort_Ep0_Ep1_PTBR.md
// ==========================================

interface SeedScene {
    type: 'chat' | 'system_card' | 'choice' | 'image_card';
    payload: any;
}

interface SeriesData {
    slug: string;
    titlePt: string;
    descriptionPt: string;
    tropePrimary: string;
    tropeSecondary?: string;
    tags: string[];
    maturityLevel: string;
    status: string;
    coverAssetUrl: string;
}

interface EpisodeData {
    number: number;
    titlePt: string;
    status: string;
    estimatedSeconds: number;
    isPaywalled: boolean;
    scenes?: SeedScene[];
}

// ==========================================
// Safe Upsert Functions
// ==========================================

async function upsertSeries(data: SeriesData): Promise<string> {
    const series = await prisma.series.upsert({
        where: { slug: data.slug },
        update: {
            titlePt: data.titlePt,
            descriptionPt: data.descriptionPt,
            tropePrimary: data.tropePrimary,
            tropeSecondary: data.tropeSecondary,
            tags: JSON.stringify(data.tags),
            maturityLevel: data.maturityLevel,
            status: data.status,
            coverAssetUrl: data.coverAssetUrl,
        },
        create: {
            slug: data.slug,
            titlePt: data.titlePt,
            descriptionPt: data.descriptionPt,
            tropePrimary: data.tropePrimary,
            tropeSecondary: data.tropeSecondary,
            tags: JSON.stringify(data.tags),
            maturityLevel: data.maturityLevel,
            status: data.status,
            coverAssetUrl: data.coverAssetUrl,
        },
    });
    return series.id;
}

async function upsertEpisode(seriesId: string, data: EpisodeData): Promise<string> {
    const episode = await prisma.episode.upsert({
        where: {
            seriesId_number: { seriesId, number: data.number },
        },
        update: {
            titlePt: data.titlePt,
            status: data.status,
            estimatedSeconds: data.estimatedSeconds,
            isPaywalled: data.isPaywalled,
        },
        create: {
            seriesId,
            number: data.number,
            titlePt: data.titlePt,
            status: data.status,
            estimatedSeconds: data.estimatedSeconds,
            isPaywalled: data.isPaywalled,
        },
    });

    // Upsert scenes if provided
    if (data.scenes && data.scenes.length > 0) {
        // Delete existing scenes for this episode and recreate
        await prisma.scene.deleteMany({ where: { episodeId: episode.id } });
        for (let i = 0; i < data.scenes.length; i++) {
            await prisma.scene.create({
                data: {
                    episodeId: episode.id,
                    ordinal: i,
                    type: data.scenes[i].type,
                    payload: JSON.stringify(data.scenes[i].payload),
                },
            });
        }
    }

    return episode.id;
}

// ==========================================
// Main Seed Function
// ==========================================

async function main() {
    const isDevSeed = process.env.DEV_SEED === '1';

    console.log('🌱 Seeding database...');
    console.log(`   Mode: ${isDevSeed ? '⚠️  DEV (will clear user data)' : '✅ PROD (preserves user data)'}`);

    // ==========================================
    // DEV MODE ONLY: Clear all data
    // ==========================================
    if (isDevSeed) {
        console.log('⚠️  DEV MODE: Clearing ALL data including users/payments...');
        await prisma.event.deleteMany();
        await prisma.progress.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.entitlement.deleteMany();
        await prisma.keysBalance.deleteMany();
        await prisma.scene.deleteMany();
        await prisma.episode.deleteMany();
        await prisma.series.deleteMany();
        await prisma.user.deleteMany();
        console.log('✅ Data cleared');
    }

    console.log('📚 Upserting pilot series...');

    // ==========================================
    // PILOT 1: Divórcio de Cinco Anos
    // ==========================================
    const series1Id = await upsertSeries({
        slug: 'divorcio-de-cinco-anos',
        titlePt: 'Divórcio de Cinco Anos',
        descriptionPt: 'Você viveu 5 anos em um casamento por contrato. No dia do término, tudo muda.',
        tropePrimary: 'contract',
        tropeSecondary: 'second_chance',
        tags: ['casamento', 'contrato', 'mistério', 'proteção'],
        maturityLevel: 'SFW',
        status: 'published',
        coverAssetUrl: '/assets/covers/divorcio.webp',
    });

    // Episode 0
    await upsertEpisode(series1Id, {
        number: 0,
        titlePt: 'Hoje Acaba',
        status: 'published',
        estimatedSeconds: 90,
        isPaywalled: false,
        scenes: [
            { type: 'system_card', payload: { text: 'Chat com Bia (amiga)', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'bia', speakerName: 'Bia', text: 'Lia… você tem certeza?', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Hoje faz 5 anos. O contrato acaba às 23:59.', delayMs: 1000, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'bia', speakerName: 'Bia', text: 'E ele?', delayMs: 600, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Ele nem vai ligar. Nunca ligou.', delayMs: 800, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'bia', speakerName: 'Bia', text: 'Você vai pedir divórcio por mensagem?', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Vou pedir por dignidade.', delayMs: 600, isProtagonist: true } },
            { type: 'system_card', payload: { text: 'Você abre o chat com Henrique. Visto por último: ontem.', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Henrique. Hoje, 23:59. Quero o divórcio assim que o contrato vencer.', delayMs: 1200, isProtagonist: true } },
            { type: 'system_card', payload: { text: '...digitando...', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Não.', delayMs: 500, isProtagonist: false, mood: 'cold' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: '…?', delayMs: 300, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Você não pode.', delayMs: 600, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Eu não posso ou você não quer?', delayMs: 800, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Lia. Leia a cláusula 7.3. Agora.', delayMs: 1000, isProtagonist: false, mood: 'urgent' } },
            { type: 'image_card', payload: { imageAssetUrl: '/assets/docs/contrato.webp', captionPt: 'CONTRATO — Cláusula 7.3: Rescisão unilateral aciona proteção...' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Isso é piada. Você adicionou isso sem eu ver.', delayMs: 1000, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Eu adicionei para te manter viva.', delayMs: 800, isProtagonist: false, mood: 'serious' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Viva… do quê?', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Do homem que comprou a sua família.', delayMs: 1200, isProtagonist: false, mood: 'dark' } },
            { type: 'system_card', payload: { text: '📱 Notificação: número desconhecido', type: 'notification' } },
            { type: 'chat', payload: { speakerId: 'unknown', speakerName: '???', text: 'Parabéns pelo divórcio, Lia. Finalmente vou te buscar.', delayMs: 1500, isProtagonist: false, mood: 'threatening' } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'read', labelPt: '📄 Ler a cláusula completa', effects: { routeFlags: { read_clause: true } } },
                        { id: 'run', labelPt: '🏃 Bloquear e correr agora', effects: { routeFlags: { panicked: true } } },
                    ]
                }
            },
        ],
    });

    // Episode 1
    await upsertEpisode(series1Id, {
        number: 1,
        titlePt: 'A Ameaça é Real',
        status: 'published',
        estimatedSeconds: 240,
        isPaywalled: false,
        scenes: [
            { type: 'system_card', payload: { text: 'Uma foto sua, tirada há 5 minutos, aparece na tela.', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Não sai sozinha. Desliga a luz.', delayMs: 800, isProtagonist: false, mood: 'urgent' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Você está me controlando.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Estou te mantendo viva.', delayMs: 800, isProtagonist: false } },
            { type: 'system_card', payload: { text: 'Ele envia um documento confidencial.', type: 'narrator' } },
            { type: 'image_card', payload: { imageAssetUrl: '/assets/docs/ordem.webp', captionPt: 'Ordem de proteção — Segurança particular desde 2020' } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Você acha que eu sou frio. Eu sou… cuidadoso.', delayMs: 1200, isProtagonist: false, mood: 'vulnerable' } },
            { type: 'chat', payload: { speakerId: 'unknown', speakerName: '???', text: '23:59 você é minha.', delayMs: 1000, isProtagonist: false, mood: 'threatening' } },
            { type: 'chat', payload: { speakerId: 'lia', speakerName: 'Você', text: 'Por que eu?', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Porque você é a única testemunha que ele não conseguiu apagar.', delayMs: 1500, isProtagonist: false } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'pretend', labelPt: '🎭 Fingir e sobreviver (por enquanto)', effects: { routeFlags: { fake_marriage: true }, meters: { henrique: 10 } } },
                        { id: 'expose', labelPt: '💥 Expor e arriscar tudo', effects: { routeFlags: { expose_villain: true }, meters: { henrique: -5 } } },
                    ]
                }
            },
            { type: 'chat', payload: { speakerId: 'henrique', speakerName: 'Henrique', text: 'Ele já está no elevador.', delayMs: 1000, isProtagonist: false, mood: 'urgent' } },
            { type: 'system_card', payload: { text: '🔒 Desbloqueie a Rota Verdade para continuar', type: 'narrator' } },
        ],
    });

    // Episode 2 (Paywalled, no scenes)
    await upsertEpisode(series1Id, {
        number: 2,
        titlePt: 'O Plano',
        status: 'published',
        estimatedSeconds: 180,
        isPaywalled: true,
    });

    // ==========================================
    // PILOT 2: O Marido Invisível
    // ==========================================
    const series2Id = await upsertSeries({
        slug: 'o-marido-invisivel',
        titlePt: 'O Marido Invisível',
        descriptionPt: 'Seu marido desapareceu há um ano. Hoje ele voltou — e nada é o que parece.',
        tropePrimary: 'secret_identity',
        tropeSecondary: 'revenge',
        tags: ['segredo', 'poder', 'família', 'humilhação'],
        maturityLevel: 'SFW',
        status: 'published',
        coverAssetUrl: '/assets/covers/marido.webp',
    });

    await upsertEpisode(series2Id, {
        number: 0,
        titlePt: 'O Retorno',
        status: 'published',
        estimatedSeconds: 90,
        isPaywalled: false,
        scenes: [
            { type: 'chat', payload: { speakerId: 'celina', speakerName: 'Mãe', text: 'Eles levaram tudo. Até a geladeira.', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'nina', speakerName: 'Você', text: 'Mãe, respira. Eu vou resolver.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'celina', speakerName: 'Mãe', text: 'Resolver como? Você casou com um… ninguém.', delayMs: 1000, isProtagonist: false } },
            { type: 'system_card', payload: { text: 'Você abre o chat com Davi. Última mensagem: 1 ano atrás.', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'nina', speakerName: 'Você', text: 'Davi… se você estiver vivo… eu tô sendo despejada.', delayMs: 1000, isProtagonist: true } },
            { type: 'system_card', payload: { text: '✓✓ Visto — após 1 ano', type: 'notification' } },
            { type: 'chat', payload: { speakerId: 'davi', speakerName: 'Davi', text: 'Não abre a porta pra ninguém.', delayMs: 600, isProtagonist: false, mood: 'urgent' } },
            { type: 'chat', payload: { speakerId: 'nina', speakerName: 'Você', text: '…Davi?', delayMs: 400, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'davi', speakerName: 'Davi', text: 'Eu tô chegando.', delayMs: 600, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'nina', speakerName: 'Você', text: 'Você tá… onde?', delayMs: 500, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'davi', speakerName: 'Davi', text: 'Atrás de você.', delayMs: 800, isProtagonist: false, mood: 'dramatic' } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'door', labelPt: '🚪 Abrir a porta', effects: { routeFlags: { trusting: true } } },
                        { id: 'proof', labelPt: '📷 Pedir prova (foto/voz)', effects: { routeFlags: { cautious: true } } },
                    ]
                }
            },
        ],
    });

    await upsertEpisode(series2Id, { number: 1, titlePt: 'Quem é Você?', status: 'published', estimatedSeconds: 180, isPaywalled: false });
    await upsertEpisode(series2Id, { number: 2, titlePt: 'O Poder', status: 'published', estimatedSeconds: 180, isPaywalled: true });

    // ==========================================
    // PILOT 3: Noiva de Mentira do Astro
    // ==========================================
    const series3Id = await upsertSeries({
        slug: 'noiva-de-mentira',
        titlePt: 'Noiva de Mentira do Astro',
        descriptionPt: 'Um contrato de 30 dias. Uma mentira para a mídia. Uma verdade que pode destruir tudo.',
        tropePrimary: 'fake_relationship',
        tropeSecondary: 'celebrity',
        tags: ['celebridade', 'escândalo', 'contrato', 'gravidez'],
        maturityLevel: 'SFW',
        status: 'published',
        coverAssetUrl: '/assets/covers/noiva.webp',
    });

    await upsertEpisode(series3Id, {
        number: 0,
        titlePt: 'A Proposta',
        status: 'published',
        estimatedSeconds: 90,
        isPaywalled: false,
        scenes: [
            { type: 'chat', payload: { speakerId: 'maya', speakerName: 'Maya (PR)', text: 'Carla, por favor… é só você sorrir e segurar a mão dele. 30 dias.', delayMs: 1000, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'carla', speakerName: 'Você', text: 'Você tá me confundindo com outra pessoa.', delayMs: 800, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'enzo', speakerName: 'Enzo', text: 'Eu não tô confundindo. Eu tô pedindo.', delayMs: 800, isProtagonist: false, mood: 'charming' } },
            { type: 'chat', payload: { speakerId: 'carla', speakerName: 'Você', text: 'Você nem me conhece.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'enzo', speakerName: 'Enzo', text: 'Eu sei que você precisa de dinheiro. Eu também preciso de… silêncio.', delayMs: 1200, isProtagonist: false } },
            { type: 'image_card', payload: { imageAssetUrl: '/assets/docs/contrato_noivado.webp', captionPt: 'CONTRATO — Noivado de fachada — 30 dias' } },
            { type: 'chat', payload: { speakerId: 'maya', speakerName: 'Maya (PR)', text: 'A cirurgia do seu irmão custa quanto mesmo?', delayMs: 1000, isProtagonist: false } },
            { type: 'system_card', payload: { text: '📰 ENZO ASSUME NOIVA MISTERIOSA', type: 'notification' } },
            { type: 'chat', payload: { speakerId: 'carla', speakerName: 'Você', text: 'Eu nem assinei ainda!', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'enzo', speakerName: 'Enzo', text: 'Já era. Agora, se você me abandonar… eu caio. E você também.', delayMs: 1200, isProtagonist: false } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'sign', labelPt: '✍️ Assinar o contrato', effects: { routeFlags: { signed: true } } },
                        { id: 'leave', labelPt: '🚶 Dizer não e ir embora', effects: { routeFlags: { refused: true } } },
                    ]
                }
            },
        ],
    });

    await upsertEpisode(series3Id, { number: 1, titlePt: 'As Regras', status: 'published', estimatedSeconds: 180, isPaywalled: false });

    // ==========================================
    // PILOT 4: A Filha Perdida do Império
    // ==========================================
    const series4Id = await upsertSeries({
        slug: 'filha-perdida',
        titlePt: 'A Filha Perdida do Império',
        descriptionPt: 'Um testamento vai mudar tudo. Você é a herdeira que tentaram apagar.',
        tropePrimary: 'lost_heiress',
        tropeSecondary: 'revenge',
        tags: ['herdeira', 'família', 'vingança', 'irmãos'],
        maturityLevel: 'SFW',
        status: 'published',
        coverAssetUrl: '/assets/covers/herdeira.webp',
    });

    await upsertEpisode(series4Id, {
        number: 0,
        titlePt: 'O Testamento',
        status: 'published',
        estimatedSeconds: 90,
        isPaywalled: false,
        scenes: [
            { type: 'chat', payload: { speakerId: 'azevedo', speakerName: 'Dr. Azevedo', text: 'Júlia… eu sei que isso parece golpe. Mas é urgente.', delayMs: 1000, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'julia', speakerName: 'Você', text: 'Quem é você?', delayMs: 500, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'azevedo', speakerName: 'Dr. Azevedo', text: 'Advogado do Sr. Montenegro. O falecido.', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'julia', speakerName: 'Você', text: 'Eu não conheço nenhum Montenegro.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'azevedo', speakerName: 'Dr. Azevedo', text: 'Ele deixou uma coisa pra você. E pediu… que você vá ao funeral.', delayMs: 1200, isProtagonist: false } },
            { type: 'system_card', payload: { text: 'Funeral luxuoso. Você está no fundo da sala.', type: 'narrator' } },
            { type: 'system_card', payload: { text: '"Deixo 40% do Grupo Montenegro para… Júlia S. — minha filha."', type: 'document' } },
            { type: 'chat', payload: { speakerId: 'rafael', speakerName: 'Rafael', text: 'Você não é filha dele.', delayMs: 800, isProtagonist: false, mood: 'hostile' } },
            { type: 'chat', payload: { speakerId: 'julia', speakerName: 'Você', text: 'Eu nem sabia que ele existia.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'rafael', speakerName: 'Rafael', text: 'Então você é pior: é uma impostora.', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'rafael', speakerName: 'Rafael', text: 'Você vai fazer o teste. Hoje.', delayMs: 600, isProtagonist: false } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'test', labelPt: '🧬 Fazer o teste de DNA', effects: { routeFlags: { brave: true } } },
                        { id: 'run', labelPt: '🏃 Fugir do funeral', effects: { routeFlags: { scared: true } } },
                    ]
                }
            },
        ],
    });

    await upsertEpisode(series4Id, { number: 1, titlePt: 'A Verdade', status: 'published', estimatedSeconds: 180, isPaywalled: false });

    // ==========================================
    // PILOT 5: Marca do Dragão
    // ==========================================
    const series5Id = await upsertSeries({
        slug: 'marca-do-dragao',
        titlePt: 'Marca do Dragão',
        descriptionPt: 'A marca proibida apareceu em você. Agora seu destino está ligado a ele.',
        tropePrimary: 'academy',
        tropeSecondary: 'contract',
        tags: ['fantasia', 'academia', 'dragão', 'vínculo'],
        maturityLevel: 'SFW',
        status: 'published',
        coverAssetUrl: '/assets/covers/dragao.webp',
    });

    await upsertEpisode(series5Id, {
        number: 0,
        titlePt: 'A Cerimônia',
        status: 'published',
        estimatedSeconds: 90,
        isPaywalled: false,
        scenes: [
            { type: 'chat', payload: { speakerId: 'luna', speakerName: 'Luna', text: 'Não olha pra ele. Dizem que o Draven… sente medo.', delayMs: 800, isProtagonist: false } },
            { type: 'chat', payload: { speakerId: 'iris', speakerName: 'Você', text: 'Medo? Eu tô tremendo.', delayMs: 600, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'luna', speakerName: 'Luna', text: 'Todo mundo treme. Ele é ligado a um dragão.', delayMs: 800, isProtagonist: false } },
            { type: 'system_card', payload: { text: '🔥 Cerimônia de Aproximação das Marcas', type: 'narrator' } },
            { type: 'system_card', payload: { text: '"Se a marca surgir… você pertence."', type: 'document' } },
            { type: 'chat', payload: { speakerId: 'iris', speakerName: 'Você', text: '(sussurro) Isso é absurdo.', delayMs: 500, isProtagonist: true } },
            { type: 'system_card', payload: { text: '✨ Uma queimação. A marca aparece no seu pulso.', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'luna', speakerName: 'Luna', text: 'ÍRIS— sua mão tá brilhando!', delayMs: 600, isProtagonist: false } },
            { type: 'system_card', payload: { text: 'O silêncio cai. Draven vira o rosto.', type: 'narrator' } },
            { type: 'chat', payload: { speakerId: 'draven', speakerName: 'Draven', text: 'Não.', delayMs: 500, isProtagonist: false, mood: 'cold' } },
            { type: 'chat', payload: { speakerId: 'iris', speakerName: 'Você', text: 'O quê?', delayMs: 300, isProtagonist: true } },
            { type: 'chat', payload: { speakerId: 'draven', speakerName: 'Draven', text: 'Isso não pode ser com você.', delayMs: 800, isProtagonist: false, mood: 'conflicted' } },
            { type: 'system_card', payload: { text: '💬 Mensagem privada aparece', type: 'notification' } },
            { type: 'chat', payload: { speakerId: 'draven', speakerName: 'Draven (privado)', text: 'Se você fugir, eu vou te encontrar.', delayMs: 1000, isProtagonist: false, mood: 'intense' } },
            {
                type: 'choice', payload: {
                    options: [
                        { id: 'confront', labelPt: '⚔️ Confrontar Draven agora', effects: { routeFlags: { confrontational: true }, meters: { draven: 10 } } },
                        { id: 'hide', labelPt: '🏃 Esconder a marca e sair', effects: { routeFlags: { evasive: true }, meters: { draven: -5 } } },
                    ]
                }
            },
        ],
    });

    await upsertEpisode(series5Id, { number: 1, titlePt: 'O Vínculo', status: 'published', estimatedSeconds: 180, isPaywalled: false });

    console.log('✅ Seeding complete!');
    console.log(`   - Upserted 5 series with episodes and scenes`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
