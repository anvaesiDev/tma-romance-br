# Ultra‑Quality MVP — Technical & Product Spec  
**Product:** Telegram Mini App + Bot — Interactive Romance Serials (BR / PT‑BR)  
**Date:** 2025‑12‑13  
**Goal:** ship an MVP that is *fast, stable, responsive, and reliable*, so KPI/retention isn’t limited by tech quality.

This doc is written so you can implement end‑to‑end solo (with UI/UX help), without leaving “unknowns” that later break metrics.

---

## 1) What we are building (1 paragraph)

A Telegram Mini App (TMA) that plays **interactive romance “chat‑fiction” serials** in Portuguese (Brazil). Users choose tropes, start reading instantly (no install), make choices, unlock routes, and either wait (free keys) or pay via **Telegram Stars** for unlimited access / VIP routes. Growth is driven by **Telegram channels + StarRef affiliates**, with paid traffic used only as a controlled test.

---

## 2) Non‑negotiable MVP quality targets (technical KPIs)

### 2.1 Performance budgets (must meet on mid‑range Android)
**Devices:** Android 10–14, 4GB RAM, 4G network, Telegram latest stable  
**Targets:**
- **TTI (time to interactive):** ≤ 1.5s P50, ≤ 2.8s P95
- **First contentful paint (FCP):** ≤ 1.0s P50, ≤ 2.0s P95
- **JS total (gzip):** ≤ 250KB initial route (home+reader shell)
- **Image payload:** ≤ 200KB per screen; use WebP/AVIF fallback
- **API latency:** ≤ 250ms P50, ≤ 800ms P95 (Brazil edge if possible)

### 2.2 Stability / reliability targets
- **Crash‑free sessions:** ≥ 99.5% (Sentry “crash‑free sessions”)
- **Client error rate:** ≤ 0.5% sessions with uncaught exception
- **Backend availability:** ≥ 99.9% monthly
- **Payment correctness:** 0 tolerance for double‑grant / wrong entitlement
- **Idempotency:** every purchase/entitlement operation is idempotent

### 2.3 Responsiveness
- Works on smallest phones (360×640 CSS px) to tablets/desktop.
- No layout break on Telegram top/bottom bars, safe areas, and `viewportStableHeight`.

---

## 3) Constraints you must design around (Telegram)

### 3.1 Stars-only for digital goods
Inside Telegram, digital goods/access must use **Telegram Stars**; bypassing payment rules can lead to restricted visibility on mobile.  
Primary source: `https://core.telegram.org/bots/payments-stars`

### 3.2 Refund/dispute obligations and hold
You must support dispute handling and refunds; Stars may have a **hold up to 21 days** before withdrawal.  
Primary source: `https://telegram.org/tos/bot-developers`

### 3.3 Mini App specifics
- Runs inside Telegram webview; must use **Telegram Web Apps API** features safely.
- Handle theme parameters and resizing events.
Docs: `https://core.telegram.org/bots/webapps`

---

## 4) MVP scope (features) — “Ultra‑quality MVP”, not “prototype”

### 4.1 Must‑have (MVP v1)
**Core reading**
- Library: 5 pilot serials (each at least Ep.0 + Ep.1; ideally Ep.0–Ep.2)
- Reader: chat bubbles + typing indicator + choice buttons + optional media cards (image/voice note)
- Micro‑branching: choices affect route flags and relationship meter; converge back (no content explosion)
- Progress: resume/continue across devices

**Onboarding**
- 30–45s onboarding: trope selection + intensity (mild/bold) + optional name
- Auto‑start Ep.0 after onboarding

**Monetization (Stars)**
- Paywall after Ep.1 “value moment”
- Products:
  - Key packs (consumables) — first purchase optimized
  - 250⭐ entry (limited keys/day)
  - 500⭐ core (unlimited + early access)
  - 1000⭐ VIP (VIP routes + more early access)
  - Tips (optional)
- Entitlements system that can revoke access on refund

**Retention**
- Daily keys / energy system
- Streaks (simple)
- Bot notifications (opt‑in): “new episode”, “your route updated”
- Cadence: 1 new episode/day across product (not necessarily per series)

**Acquisition**
- Deep links from channels to a specific series/trope
- Referral tracking by `source_id` and affiliate id (StarRef)

**Support**
- `/paysupport` route in bot
- Refund request flow (manual + tooling)

**Analytics**
- Event tracking pipeline (client → backend) with strict schema
- Cohorts by source (channel/affiliate/paid)
- Dashboard queries (even if just SQL + Metabase)

### 4.1.1 Screen map (every MVP screen + key states)
**Global requirements for every screen**
- `loading` state (skeleton, not spinner)
- `error` state (retry + “voltar”)
- `offline` state (show cached content + “tentar novamente”)
- Safe‑area + Telegram header/footer aware

**Entry**
1) **Bootstrap / Preload**
   - Purpose: initialize Telegram WebApp, verify session, warm caches.
   - Shows: lightweight splash (≤ 1s) + “Carregando…”
2) **Age gate (only if you ship Bold content)**
   - Simple 18+ confirmation + “Conteúdo romântico; sem explícito”
   - Store user choice; allow user to switch back to SFW mode anytime
3) **Onboarding (3 steps)**
   - Step 1: Tropes picker (cards)
   - Step 2: Intensity (Mild/Bold wording, SFW)
   - Step 3: Name (optional) + notifications opt‑in (optional)
3) **Home / Library**
   - Continue card
   - “Para você” (personalized by tropes + behavior)
   - “Novo hoje” (daily drop)
4) **Story Detail**
   - Cover + hook + trope chips + duration
   - Start/Continue + “Último capítulo lido”
5) **Reader**
   - Chat message list (virtualized)
   - Typing indicator
   - Media cards (image/voice)
   - Choice panel (2–3 buttons)
   - Progress header (Ep x/y) + route label
6) **Paywall**
   - Three options max:
     - Buy keys pack (consumable)
     - Unlimited 500⭐ (core)
     - VIP 1000⭐ (optional, can be delayed by segment)
   - Support link: “Ajuda: /paysupport”
7) **Store / Keys**
   - Key packs list (small / medium / large)
   - “Como funciona” explanation
8) **Subscription / Pass management**
   - Current plan, renewal date, how to cancel (Telegram flow), restore entitlement state
9) **Profile / Settings**
   - Notifications toggle
   - Language (future)
   - Terms/Privacy
   - Support entry
10) **Support (in-app)**
   - FAQ: payments, Stars, refunds
   - Button to open `/paysupport` chat with the bot
11) **Share modal**
   - “Compartilhar” (copy link / share to channel)
   - Optional: “unlock by sharing” for free users (must not be spammy)
12) **Error screens**
   - Payment failed / invoice canceled
   - Content unavailable / removed
   - Maintenance mode

### 4.1.2 User flows (end-to-end, MVP)
**A) First open (from channel deep link)**
1) `t.me/bot?startapp=src_x_series_y` → Mini App opens
2) Bootstrap: `WebApp.ready()` → send `initData` to backend → session ok
3) (If needed) Age gate → choose SFW/Bold mode
4) Onboarding (trope/intensity/name) → auto-start Ep.0 for the linked series
5) After Ep.1 complete → paywall (keys pack + 500⭐)

**B) Returning user**
1) Open Mini App → show “Continue” instantly (from local resume pointer)
2) Sync progress in background → reconcile conflicts

**C) Free progression**
1) Consume daily keys
2) When keys == 0 → show countdown + paywall (keys pack first)

**D) First purchase (keys pack)**
1) Tap keys pack → open Stars invoice (`openInvoice`)
2) On success → grant keys balance (consumable) + unlock immediate continue

**E) Subscription purchase (500⭐ Core / 1000⭐ VIP)**
1) Tap plan → invoice → bot webhook confirms payment
2) Grant entitlement (time-based) + unlock unlimited keys + early access
3) User sees “Plan ativo” in Settings

**F) Refund**
1) User uses `/paysupport` or in-app Support
2) Operator triggers refund → entitlement revoked → access removed

**G) Notifications**
1) User opts in (explicit toggle)
2) Backend schedules messages only on meaningful events (new episode)
3) User can mute in Settings; respect this strictly

**H) Share**
1) Share modal → copy/share link with `source_id`
2) (Optional) Free reward: small keys bonus after *organic* share (no spam incentives)

### 4.2 Nice‑to‑have (MVP+)
- “Season pass” one‑time purchase
- In‑app “share to unlock” (non‑spammy) for free users
- Content admin UI (web) for releases, flags, experiments
- A/B experiments framework (simple)
- Offline cache of last episode content

### 4.3 Explicit non‑goals for MVP
- Full video micro‑drama (creates VOD/regulatory + heavy perf burdens)
- UGC author marketplace
- AI companion chat (policy, moderation, cost)

---

## 5) Architecture overview

```
Telegram User
   │
   ├─ Telegram Mini App (WebView)
   │     └─ HTTPS → Edge/CDN → Frontend (static)
   │                 └─ HTTPS → Backend API
   │                           ├─ Postgres (core data)
   │                           ├─ Object storage (images/audio)
   │                           ├─ Analytics store (events)
   │                           └─ Job queue (notifications)
   │
   └─ Telegram Bot
         ├─ /start deep links
         ├─ createInvoiceLink (Stars)
         ├─ updates webhook (payments, commands)
         └─ notifications (opt‑in)
```

Key principle: **Thin client**. The Mini App renders; the backend owns truth: content, progress, entitlements, analytics. This makes PWA/standalone port feasible later.

---

## 6) Recommended tech stack (solo‑friendly, production‑grade)

### 6.1 Frontend (Telegram Mini App)
**Goal:** extremely fast UI on low‑end Android Telegram WebView.

**Chosen stack (recommended): TypeScript + Preact**
- UI runtime: `preact`
- Fine‑grained state: `@preact/signals` (preferred)
- Routing: avoid heavy routers; simple internal router or `preact-router` only if needed
- Forms: native inputs (no heavy form libs)

Build tool:
- **Vite** (static SPA, aggressive code‑splitting, minimal runtime). Avoid SSR for MVP.

UI/CSS:
- **Tailwind** (JIT; minimal CSS output) or a tiny CSS modules setup.

Data fetching:
- Keep it lean: `fetch` + a small cache layer. If you need a library, prefer **TanStack Query** but watch bundle size.

Error monitoring:
- **Sentry** (frontend)

Why:
- Bun does *not* run on the client; the Telegram WebView runs the JS bundle you ship.  
- For chat UIs, the biggest wins are (1) bundle size + (2) list rendering strategy (virtualization), not the server runtime.

### 6.2 Backend API
**Keep backend boring and correct.** Payments + entitlements demand reliability more than micro‑benchmarks.

Option A (lean + portable): **TypeScript + Hono**
- Run on **Node LTS** (default) for predictability, or on **Bun** if you’re comfortable.
- Validation: zod
- Logging: pino
- Auth: Telegram initData verification
- Jobs: lightweight queue (Redis/BullMQ) *or* Postgres scheduled jobs for MVP

Option B (classic): **Node.js + Fastify** (if you prefer traditional server patterns).

Option C (max reliability + perf): **Go** (Fiber/Gin).

Note on Bun:
- Bun is great for DX and server throughput, but it won’t magically speed up the Mini App UI. Use it if it reduces your dev time without increasing production risk.

### 6.3 Database
- **Postgres** (Neon/Supabase/RDS)
- Migrations: **Prisma** or **Drizzle** (or SQL + goose)

### 6.4 Storage/CDN
- Images/audio: S3‑compatible (Cloudflare R2 / AWS S3)
- CDN: Cloudflare (cache static + media)

### 6.5 Hosting
- Frontend: Cloudflare Pages / Vercel / Netlify (static)
- Backend: Fly.io / Render / Railway / EC2 (choose stable)
- Webhooks: stable public HTTPS endpoint (Cloudflare Tunnel if needed)

### 6.6 Telegram integration libraries (what to include)
**Mini App (WebApp)**
- Official Telegram WebApp JS script (required):  
  - add `<script src="https://telegram.org/js/telegram-web-app.js"></script>` to `index.html` head. `https://core.telegram.org/bots/webapps`
- TypeScript-friendly wrapper (choose one):
  - `@twa-dev/sdk` (popular wrapper around `window.Telegram.WebApp`). `https://github.com/twa-dev/SDK`
  - `@grammyjs/web-app` (types + scoped access to `window.Telegram`). `https://github.com/grammyjs/web-app`

**Bot**
- `grammy` (TypeScript bot framework) for webhook-based bot. `https://grammy.dev/`

### 6.7 Minimal npm dependency list (suggested)
Frontend:
- `preact`, `@preact/signals`, `@sentry/browser`
- `@twa-dev/sdk` (or `@grammyjs/web-app`)
- `@tanstack/virtual-core` (or `@tanstack/react-virtual` + `preact/compat`)
- `tailwindcss`, `postcss`, `autoprefixer`

Backend:
- `hono`, `zod`, `pino`, `pg` (or `postgres`), migrations tool (Drizzle/Prisma)
- `grammy` (bot) and a webhook adapter

You can keep it even leaner; the core requirement is correctness + observability.

---

## 7) Security model (must be correct from day 1)

### 7.1 Auth: Telegram initData verification
Mini App sends `initData` to backend. Backend must:
1) parse query string into fields
2) verify hash with bot token (HMAC‑SHA256)
3) enforce freshness (check `auth_date`, TTL e.g. 1 hour)
4) create session JWT (short‑lived) for API calls

Docs: `https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app`

### 7.2 Abuse protection
- Rate limits per `tg_user_id` and per IP
- Bot command throttles
- Detect automation patterns (see fraud section)

### 7.3 Data minimization
Store only:
- `tg_user_id`
- optional `username` (non‑critical)
- locale, timezone guess
Avoid storing phone/email unless you *explicitly* add it for Plan B.

### 7.4 Privacy / LGPD (Brazil)
Design so you’re compliant by default:
- Collect the minimum data needed to deliver the product (progress + entitlements).
- Provide **Privacy Policy (PT‑BR)** and **Terms** inside the Mini App (Profile/Settings).
- Provide a simple “Delete my data” request path (in‑app + via bot support).
- If you later add Plan B PWA with email/Stripe login, collect email only with explicit consent and document retention/deletion.

---

## 8) Data model (minimum viable schema)

### 8.1 Core tables (Postgres)
**users**
- id (uuid), tg_user_id (bigint unique), created_at, last_seen_at
- locale, tz_offset, marketing_source_first, marketing_source_last

**series**
- id, slug, title_pt, description_pt, tags (jsonb), cover_asset_id, status (draft/published)
- trope_primary, trope_secondary, maturity_level (SFW/BOLD)

**episodes**
- id, series_id, number, title_pt, release_at, status
- content_version (int), estimated_seconds

**scenes**
- id, episode_id, ordinal
- type (chat/message_card/voice_card/image_card/system_card)
- payload (jsonb)  ← schema‑validated

**choices**
- id, scene_id
- label_pt, next_scene_id (nullable), effects (jsonb)

**progress**
- user_id, series_id, episode_id, scene_id
- route_flags (jsonb), meters (jsonb), updated_at

**entitlements**
- user_id, entitlement_type (sub_core/sub_vip/season_pass)
- source (stars), starts_at, ends_at, status (active/revoked)

**payments**
- id, user_id
- provider (stars), currency (XTR), stars_amount
- invoice_payload, telegram_charge_id?, provider_payment_id?
- status (pending/paid/refunded/chargeback)
- created_at, paid_at

**events**
- id, user_id, session_id, source_id
- event_name, props (jsonb), created_at

**notifications**
- id, user_id, type, scheduled_at, sent_at, status

**affiliate_sources**
- source_id (string), kind (channel/affiliate/paid)
- metadata (jsonb)

### 8.2 Content payload schema (JSON)
Define a strict JSON schema for each `scene.type`. Example:
- `chat`: { speaker_id, text, delay_ms, mood, attachments? }
- `voice_card`: { audio_asset_id, transcript_pt, duration_s }
- `image_card`: { image_asset_id, caption_pt }

Strict validation prevents runtime crashes and broken episodes.

---

## 9) Payments (Stars) — end-to-end flow

### 9.1 Purchase flow (Mini App)
1) User taps “Unlock / Subscribe”.
2) Mini App calls backend `POST /pay/create-invoice` with `sku`.
3) Backend calls Bot API `createInvoiceLink` with Stars invoice params.
4) Backend returns invoice link.
5) Mini App calls `Telegram.WebApp.openInvoice(url)` and listens to callback.
6) Bot receives `successful_payment` update (webhook).
7) Backend verifies update signature (webhook secret), writes payment as `paid`, grants entitlement.
8) Mini App polls `GET /me/entitlements` or receives push update.

Bot API: `https://core.telegram.org/bots/api` (invoice links, stars, subscriptions)

### 9.2 Idempotency rules (critical)
- Key: `invoice_payload` or `provider_payment_id` unique.
- Entitlement grant must be idempotent: same payment cannot grant twice.
- Use DB transaction with unique constraint.

### 9.3 Refunds / disputes
- Provide `/paysupport` command and a mini form:
  - reason, payment id, desired resolution
- Operator tool: button “refund” triggers `refundStarPayment` (Bot API) and revokes entitlement.
- Keep an “abuse score” but be careful with false positives.

### 9.4 Subscription vs “Season pass”
For BR, consider leading with “pass” (battle‑pass mental model) and keep subscription as “Core”.
MVP can ship with subscription only; season pass is MVP+.

---

## 10) Affiliate / StarRef tracking (process‑friendly)

### 10.1 Source tracking
Every link to your Mini App must include a `source_id`:
- `t.me/YourBot?startapp=src_<sourceid>_series_<slug>`

On first open:
- store `marketing_source_first`, and always update `marketing_source_last`.
- attribute purchases to last source within window (e.g., 7 days), and also keep first‑touch.

### 10.2 Anti-fraud heuristics (MVP level)
Flag a source if:
- `episode_0_complete/open` is extremely low (< 20%) OR
- purchases happen < 20 seconds after open repeatedly OR
- refund rate > 2× baseline

Response:
- don’t instantly ban; reduce bonus commission; ask partner to change posting style.

---

## 11) Analytics spec (events, funnels, dashboards)

### 11.1 Event schema (minimum)
Client events (batched):
- `miniapp_open`
- `onboarding_complete` (trope, pace)
- `episode_start` (series, episode)
- `episode_complete` (series, episode, seconds_spent)
- `choice_made` (choice_id, route_flags)
- `paywall_view` (variant, sku_shown)
- `purchase_start` (sku)
- `purchase_success` (sku, stars_amount)
- `refund_requested`
- `notification_opt_in`
- `notification_open`

### 11.2 Dashboards (must-have)
- Funnel by source: open → ep0 complete → ep1 complete → paywall view → paid
- D1/D7 cohorts by source and trope
- Refund rate by SKU + by source
- Revenue by source (gross Stars, net estimate)

---

## 12) UX & UI design system (adapted for Brazil / PT‑BR)

### 12.1 Design principle for BR
Brazilian mainstream mobile UX typically rewards:
- **Warm, expressive, emotionally explicit microcopy** (not cold корпоратив)
- “Novela/fofoca” vibe: drama hooks, not minimal sterile UI
- High readability on budget Android screens
- Trust cues around payments and support (BR consumers are sensitive to “scammy” paywalls)

### 12.2 Visual style (recommended)
**Core vibe:** “romance + drama + premium chat”.
- Light theme default, dark theme supported (Telegram theme params).
- Primary colors: deep magenta / vinho + warm accent (coral) + neutral backgrounds.
- Avoid neon casino look; keep “premium novela”.

Example palette (adjust with designer):
- Primary: `#8B1459` (vinho)
- Accent: `#FF4D6D` (coral pink)
- Success: `#22C55E`
- Warning: `#F59E0B`
- Background: `#0B0F14` (dark) / `#F7F7FB` (light)

Typography:
- Inter / SF fallback
- Body 15–16px, line-height 1.35–1.45
- Large titles 22–26px

### 12.3 Component spec (must-have)
**Home**
- “Continue” card (big)
- “For You” carousel by tropes
- “New Today” with “NEW” badge (Brazil audiences respond well to novelty cues)

**Story card**
- cover image + title + 2 trope chips + “Começar”
- small “tempo” label (ex: “2–3 min”)

**Reader (chat)**
- bubbles: left/right, distinct per character
- typing indicator (3 dots)
- media cards inline (image/voice)
- choice buttons: big tappable (min 44px)

**Paywall**
- 2–3 plans max
- show *why pay now*: “Sem esperar”, “Rota VIP”, “Episódios adiantados”
- visible link to support: “Ajuda / reembolso: /paysupport”

**Keys/energy**
- small meter + “Próximo grátis em: 03:12”
- CTA “Desbloquear agora”

### 12.4 Microcopy (PT‑BR tone)
Tone: эмоциональный, но не пошлый в публичных слоях.
Examples:
- “Ele acabou de responder…”
- “Você quer a verdade ou a vingança?”
- “Sem instalar. Comece agora.”

### 12.5 Accessibility
- Contrast AA for text
- Dynamic text size (within reason)
- Tap targets ≥ 44×44
- Avoid long paragraphs; prefer chat bubbles

---

## 13) Frontend engineering for performance

### 13.1 Minimize bundle
- No heavy UI kits; build small components.
- Code split: `reader` route separate chunk.
- Inline critical CSS (Tailwind preflight minimal).

### 13.1.1 Mandatory: chat list virtualization
Without virtualization, long chats will stutter on low‑end Android.
- Render only visible messages + small buffer (windowed list).
- Use **TanStack Virtual**:
  - Preferred (framework-agnostic): `@tanstack/virtual-core` + a small Preact adapter.
  - Alternative (fastest to ship): `preact/compat` + `@tanstack/react-virtual`.
- Keep DOM node count bounded (target: ≤ 30–40 message nodes mounted).
- Use stable keys and avoid re‑rendering the whole list when one message appends.

### 13.2 Caching
- Cache series list + covers with `stale-while-revalidate`.
- Cache last opened episode payload locally (IndexedDB) for instant resume.
  - Also write a tiny “resume pointer” to `localStorage` synchronously on every scene advance (network in BR can drop).

### 13.3 Resilience
- Every network call has retry with backoff + timeout.
- Reader gracefully degrades: if media fails, show transcript.

### 13.4 Telegram WebApp integration (must handle)
- `Telegram.WebApp.ready()` early
- `Telegram.WebApp.expand()` after first paint (optional)
- Handle:
  - `themeChanged`
  - `viewportChanged`
  - safe area insets

---

## 14) Backend engineering for reliability

### 14.1 API contracts
Use zod‑validated DTOs; reject invalid requests early.

### 14.2 Consistency & transactions
- Payment → entitlement must be a single DB transaction.
- Progress updates: upsert with optimistic concurrency (last_updated check) to avoid race.

### 14.3 Webhooks
- Bot updates endpoint must be fast (ack within 1–2s).
- Offload heavy work to queue.

### 14.4 Observability
- Structured logs (pino), correlation id per request
- Metrics: request rate/latency/error, queue lag
- Alerts: payment failures, webhook backlog, error spikes

---

## 15) QA plan (don’t ship without this)

### 15.1 Test matrix
- Android: Telegram stable, 2–3 devices (small/medium/large)
- iOS: Telegram, at least 1 device
- Desktop: Telegram desktop (webview differences)

### 15.2 Automated tests
- Backend: unit tests for auth, payments idempotency, entitlement logic
- Frontend: Playwright smoke tests (open, onboarding, start episode, paywall)

### 15.3 Load testing (simple)
- Simulate 200 concurrent users opening home + fetching an episode.
- Ensure DB indices exist; avoid N+1 queries.

---

## 16) MVP build plan (realistic, solo)

Week 1:
- Backend skeleton + Telegram auth + DB schema + content rendering MVP
- Bot skeleton + /start + deep links + webhook wiring
- Frontend: onboarding + home + reader (text only)

Week 2:
- Stars payments end‑to‑end + entitlements + paywall
- Analytics events + dashboard stub
- Media cards (image + voice) + caching

Week 3:
- Streak/keys + notifications (opt‑in) + cadence release logic
- Affiliate source tracking + anti‑fraud heuristics
- Polish UI + performance pass + error monitoring

Week 4:
- QA matrix + bugfixes + first seeding/affiliate rollout

---

## 17) Deliverables checklist (what “done” means)

- TMA loads fast (meets perf budgets) on low/medium Android
- No critical crashes in Sentry after test cohort
- Payments grant correct access; refunds revoke access
- Deep links attribute sources correctly
- Events + funnel dashboard working
- 5 serials playable with ReelShort‑level Ep.0 + Ep.1 (see `BR_Pilots_ReelShort_Ep0_Ep1_PTBR.md`)
- Support flow `/paysupport` works end‑to‑end
