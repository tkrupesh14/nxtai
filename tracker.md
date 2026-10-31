# NxtAI — Tracker

Plan and context: [plan.md](./plan.md). Update the **Status** column as work moves.

**Status:** ⬜ Todo · 🟡 In progress · ✅ Done · ⛔ Blocked
**Priority:** P0 = blocks launch · P1 = needed soon · P2 = later
**Owner:** 👤 = needs you (dashboard, account or business decision) · 🤖 = Claude can do it

## Done

| ID | Task | Done on | Ref |
|----|------|---------|-----|
| D1 | Clone repo, install Node 22, pnpm, Nginx and pm2 on EC2 | 2026-10-31 | — |
| D2 | Serve the app publicly via Nginx → pm2 | 2026-10-31 | — |
| D3 | Switch to the `dev` branch and configure Supabase env vars | 2026-10-31 | — |
| D4 | Public pages match nxtai.in; Tailwind v4 upgrade; OAuth callback route | 2026-10-31 | `e71289b` |
| D5 | Sign-in fixes: profile row creation, `/login` redirects, `/error`, middleware protection, public-origin redirects | 2026-10-31 | `913ec25` |
| D6 | Mobile menu, footer links, contact form → Supabase | 2026-10-31 | `913ec25` |
| D7 | Domain `krpex.in`, Elastic IP `54.79.194.65`, HTTPS (Let's Encrypt), Nginx timeouts + header buffers | 2026-10-31 | server config |
| D8 | Supabase schema: `users` + trigger, `contact_messages`, learning tables, RLS | 2026-10-31 | `supabase/migrations/` |
| D9 | AI learning loop: onboarding → course plan → lessons → graded quizzes → unlocking | 2026-10-31 | `913ec25` |
| D10 | AI via GPT-6 Luna on OpenRouter (Bedrock path built, awaiting AWS access) | 2026-10-31 | `lib/ai/llm.ts` |
| D11 | GitHub OAuth enabled in Supabase | 2026-10-31 | Supabase dashboard |
| D12 | **Security:** Next 15.2.4 → 15.5.28 after RCE exploitation; clean pm2 env; stopped cookie logging | 2026-10-31 | `913ec25` |
| D13 | Repo-scoped deploy key for pushes from the server | 2026-10-31 | GitHub → Deploy keys |
| D14 | AWS Activate Founders credits application staged and submitted | 2026-10-31 | startups.aws |

## Phase 0 — Security follow-up

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 0.1 | Rotate OpenRouter key; set a monthly spending limit | P0 | ⬜ | 👤 | Key was pasted in chat |
| 0.2 | Delete Bedrock API key and its IAM user `BedrockAPIKey-23lt` | P0 | ⬜ | 👤 | On disk during the attack |
| 0.3 | Revoke the GitHub PAT used for the first push | P0 | ⬜ | 👤 | Pasted in chat |
| 0.4 | Restart the Claude Code session | P0 | ⬜ | 👤 | Session token was in the dumped env |
| 0.5 | Decide: keep patched instance or rebuild from repo | P1 | ⬜ | 👤 | No persistence found |
| 0.6 | Enable Dependabot alerts + security updates | P1 | ⬜ | 👤 | Repo settings → Code security |
| 0.7 | Nginx rate limiting on POST; block scanner paths; consider WAF/Cloudflare | P1 | ⬜ | 🤖 | |
| 0.8 | AI keys out of `.env.local` (secret store / EC2 IAM role) | P2 | ⬜ | 🤖 | After Bedrock access |

## Phase 1 — Sign-in

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 1.1 | Enable OAuth providers; set Site URL + redirect URLs | P0 | 🟡 | 👤 | GitHub ✅; Google ⬜ |
| 1.2 | Auto-create `users` profile row (trigger + callback) and backfill | P0 | ✅ | | D5, D8 |
| 1.3 | Redirect unauthenticated visits to `/login?next=…` | P0 | ✅ | | D5 |
| 1.4 | `/error` page, site error boundary, OAuth errors on `/login` | P0 | ✅ | | D5 |
| 1.5 | Protect `/dashboard`, `/learn`, `/onboarding` in middleware | P1 | ✅ | | D5 |
| 1.6 | Email/password in the new design; retire `/auth/*` pages | P1 | ⬜ | 🤖 | G19 |
| 1.7 | Signed-in state in the site navbar | P1 | ⬜ | 🤖 | G18 |
| 1.8 | Verify GitHub sign-in end to end on a phone | P0 | ⬜ | 👤 | 502 fixed; needs a retry |

## Phase 2 — Production hosting

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 2.1 | Elastic IP and DNS for the domain | P0 | ✅ | | D7 |
| 2.2 | HTTPS, HTTP → HTTPS redirect, Supabase URLs | P0 | ✅ | | D7 |
| 2.3 | `pm2 startup` + `pm2 save`; `pm2-logrotate` | P0 | ⬜ | 👤 | Needs one sudo command |
| 2.4 | Deploy script, then GitHub Actions deploy on push | P1 | ⬜ | 🤖 | Deploy key exists (D13) |
| 2.5 | Uptime monitoring + alerts; Supabase backups | P1 | ⬜ | 👤🤖 | |
| 2.6 | Decide long-term host (EC2 or Vercel) | P2 | ⬜ | 👤 | |

## Phase 3 — Public site

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 3.1 | One price list for home and `/pricing` | P0 | ⬜ | 👤 | G5 — business decision |
| 3.2 | Mobile navigation menu | P1 | ✅ | | D6 |
| 3.3 | Footer links on non-home pages | P1 | ✅ | | D6 |
| 3.4 | Contact form → Supabase + email notification | P1 | 🟡 | 🤖 | Saving ✅; email ⬜ |
| 3.5 | Favicon, OG image, per-page metadata, sitemap, robots | P1 | ⬜ | 🤖 | |
| 3.6 | Analytics + Sentry | P2 | ⬜ | 👤🤖 | |

## Phase 4 — Dashboard on real data

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 4.1 | Dashboard on site tokens, Geist and `components/site/ui`; merge with `/learn` | P1 | ⬜ | 🤖 | G10 |
| 4.2 | Replace sample data with real progress, scores, streaks | P1 | ⬜ | 🤖 | |
| 4.3 | Delete legacy components, CSS, compat shim, `tailwindcss-animate` | P2 | ⬜ | 🤖 | |

## Phase 5 — Core product

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 5.1 | Onboarding quiz → AI course plan → lessons → quizzes | P1 | ✅ | | D9, D10. Tested via real API calls |
| 5.1a | Verify the learning loop end to end in the browser | P0 | ⬜ | 👤 | G17 |
| 5.1b | Regenerate lesson / report a problem; course archive & delete | P1 | ⬜ | 🤖 | |
| 5.1c | Stream lesson text while it is written | P2 | ⬜ | 🤖 | Cuts the ~35 s wait |
| 5.1d | AI usage log, per-user limits, spending alerts | P1 | ⬜ | 🤖 | G16 |
| 5.2 | Doc upload (Storage) → lessons from the learner's docs | P1 | ⬜ | 🤖 | |
| 5.3 | Module tests, final exam, certificates | P1 | 🟡 | 🤖 | Per-lesson quizzes done |
| 5.4 | Proctored coding environment | P2 | ⬜ | 🤖 | |
| 5.5 | AI mock interviews | P2 | ⬜ | 🤖 | |
| 5.6 | Communities, events, hackathons | P2 | ⬜ | 🤖 | |
| 5.7 | XP, badges, streaks, leaderboard | P2 | ⬜ | 🤖 | |
| 5.8 | Switch AI to Bedrock once AWS grants access | P2 | ⛔ | 👤 | G14 — AWS support case open |

## Phase 6 — Payments

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 6.1 | Razorpay subscriptions (Pro, Host) | P2 | ⬜ | 👤🤖 | After 3.1 |
| 6.2 | Webhooks → plan status in Supabase; feature gating | P2 | ⬜ | 🤖 | |
| 6.3 | Billing page | P2 | ⬜ | 🤖 | |

## Phase 7 — Quality

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 7.1 | Fix 20 TS errors; stop ignoring TS/ESLint in builds | P1 | ⬜ | 🤖 | G9 |
| 7.2 | Next 16; drop `@supabase/auth-helpers-nextjs`; update `recharts`; clear audit highs | P1 | 🟡 | 🤖 | Next 15.5.28 done (D12); G12, G15 |
| 7.3 | Playwright e2e + visual regression tests | P1 | ⬜ | 🤖 | |
| 7.4 | CI on pull requests (typecheck, lint, build, test) | P1 | ⬜ | 🤖 | |
