# NxtAI — Roadmap

_Last updated: 2026-11-01 · Branch: `dev` · Live: https://krpex.in · Task status lives in [tracker.md](./tracker.md)._

## Where we are

- **Public site** (`app/(site)`): `/`, `/about`, `/pricing`, `/contact`, `/login`, `/create-account`, `/forgot-password`, `/reset-password` in the nxtai.in design (light/dark, desktop/mobile). Contact form saves to Supabase.
- **Sign-in:** Supabase. GitHub OAuth, and **email + password** (sign-up with email confirmation, forgot/reset password) in the new design; auth calls run in the browser so Supabase's per-IP limits apply per learner. Google OAuth not set up yet. The old `/auth/*` pages are gone (old URLs redirect).
- **AI learning loop** (`app/(learn)`):
  - **Onboarding:** pick 1 of **9 categories** (tech / non-tech) → subject → goal (a quick AI goal check catches wrong-category, vague or harmful goals) → about you → schedule.
  - **AI professors:** one per category (labelled "AI professor", never presented as a real person). Their style shapes the course plan and every lesson; each course opens with a welcome note.
  - **Lessons as a class:** typed blocks (opening, objectives, explanation, analogy, worked example, "pause and think" checkpoints, common mistakes, real world, summary, homework), revealed one section at a time; checkpoints must be answered to continue. Final quiz (60% to pass) unlocks the next lesson.
  - **Ask the professor:** lesson-scoped chat with "Ask about this section" and quick buttons (simpler / another example / common mistakes). One structured AI call per answer (~₹0.015); off-topic, prompt-injection and harmful questions get a short redirect.
- **Plans, limits and credits** (enforced in Postgres, not the app):
  - Free: 5 questions/day (3 per lesson), 15 quick answers/day, 2 new courses/month. Pro: 40 / 10 / 100 / 10.
  - Credits are used after the free allowance: 1 per question, 20 per extra course. Max 3 new courses a day.
  - Global AI chat budget `PROFESSOR_DAILY_BUDGET_USD` (default $2/day) and `PROFESSOR_CHAT=off` kill switch.
  - Planned prices: ₹49 → 100 credits, ₹99 → 250 credits, Pro ₹499/month. **Payments not built yet**: credits/Pro can only be granted by SQL for now.
- **Account** (`/account`, `/account/settings`): profile, today's usage, plan & credits, learning preferences; change/add password, sign-in methods, sign out of all devices, delete account. Avatar menu in the header.
- **AI provider:** GPT-6 Luna ($0.10 / $0.50 per 1M tokens) through **OpenRouter** (`lib/ai/llm.ts`). Bedrock path built but blocked by AWS account access (support case open). Course plan ~15–20 s, lesson ~30–35 s.
- **Database (Supabase `dkdkokkzbptjbgjyjkpz`):** migrations 001–007 applied by hand in the SQL editor (`supabase/migrations/`). Tables: `users`, `contact_messages`, `learner_profiles`, `courses`, `course_modules`, `lessons`, `professor_questions`, `user_plans`, `credit_ledger`, `course_creations`, all with RLS. Learners can only read plan/credit/question rows; writes go through security-definer functions and triggers.
- **Dashboard** (`app/(app)/dashboard`): still the old purple theme with sample data (profile/settings now redirect to `/account`).
- **Stack:** Next.js 15.5.28, React 19.3, Tailwind v4, Supabase, OpenAI SDK (OpenRouter/Bedrock), pnpm.
- **Hosting:** one EC2 instance (Sydney), Elastic IP `54.79.194.65`, **krpex.in** (DNS at Hostinger), Let's Encrypt HTTPS, Nginx → pm2 (`nxtai`, port 3000, clean environment). Pushes via a repo-scoped deploy key.

## Security incident (2026-10-31)

Next.js 15.2.4 had a React Server Components remote-code-execution flaw. Between 21:46 and 22:58 UTC, scanners (`102.220.161.89`, `176.65.144.34`) sent 5 exploit requests that dumped the server's environment variables (Supabase anon key, a Claude Code session token). The Bedrock key was on disk, so it's treated as exposed. No persistence found.
**Done:** Next 15.5.28 / React 19.3.1, pm2 restarted with a clean environment. **Still to do:** Phase 0.

## Known gaps

| # | Gap | Status |
|---|-----|--------|
| G1 | OAuth providers | 🟡 GitHub done; Google pending |
| G5 | Home pricing ≠ `/pricing` | ✅ One list (`lib/pricing.ts`): Free, Pro ₹499/month, credits from ₹49 |
| G8 | Contact form has no email notification | 🟡 Saves to Supabase |
| G9 | TS/ESLint errors ignored in builds | 🟡 19 TS errors left, all in `components/hero-animation.tsx` |
| G10 | Dashboard on old theme with sample data | ⬜ |
| G11 | pm2 not started on boot; no log rotation | ⬜ |
| G12 | Outdated packages | 🟡 Next patched; `auth-helpers-nextjs`, `recharts` 2.x, Next 16 pending |
| G13 | Secrets pasted in chat / possibly exposed | ⬜ Rotate OpenRouter key, delete Bedrock key, revoke old GitHub PAT, restart Claude Code session |
| G14 | AWS account can't use third-party Bedrock models | ⛔ AWS support case open |
| G15 | `pnpm audit`: PostCSS (build-time) and Zod highs | ⬜ |
| G16 | AI cost controls | 🟡 Chat quotas, course limits, credits and a chat budget done; lesson generation has no per-user cap yet (see G20) |
| G17 | Learning loop not yet verified end to end by a real user; no automated tests | 🟡 Partly tested on a phone |
| G18 | Site navbar shows "Log in" when already signed in | ⬜ |
| G20 | Learners could write `courses` / `course_modules` / `lessons` directly via the Supabase API (add lessons, mark complete, reset content → AI cost; read quiz answers) | 🟡 Migration 008: writes via server-key RPCs, quiz graded in DB, `lessons.quiz` unreadable. Needs SQL run + key hash |
| G21 | Supabase built-in email only reaches team addresses (a few per hour) | ⬜ Set up custom SMTP (Hostinger `info@krpex.in`, Resend or SES) |
| G22 | Email links (confirm / reset) must be opened in the same browser (PKCE) | ⬜ Optional: switch email templates to `token_hash` links via `/auth/confirm` |

## Phases

### Phase 0 — Security follow-up (P0, now)
1. Rotate the OpenRouter key and set a spending limit; delete the Bedrock key and IAM user; revoke the old GitHub PAT; restart the Claude Code session. **(G13)**
2. Decide: keep this instance or rebuild from the repo.
3. Dependabot alerts; Nginx rate limits on `POST` and scanner paths; consider Cloudflare/WAF.
4. **Lock down direct table writes for learning data. (G20)**

### Phase 1 — Sign-in (mostly done)
1. ✅ GitHub OAuth, profile rows, protected routes, `/error`.
2. ✅ Email/password sign-up, login, forgot/reset password in the new design.
3. Custom SMTP for auth emails **(G21)**; optional cross-device email links **(G22)**.
4. Google OAuth **(G1)**; signed-in state in the site navbar **(G18)**.

### Phase 2 — Production hosting
1. ✅ Elastic IP, domain, HTTPS, Nginx tuning.
2. `pm2 startup` + `pm2 save`; `pm2-logrotate`. **(G11)**
3. Deploy script, then GitHub Actions deploy on push.
4. Uptime monitoring; Supabase backups.

### Phase 3 — Public site
1. One price list everywhere, matching the plans and credit packs. **(G5)**
2. **Policy pages required by Razorpay:** Terms, Privacy, Refund & Cancellation (Contact and Pricing exist).
3. Contact form email notification. **(G8)**
4. SEO basics (favicon, OG image, metadata, sitemap, robots); analytics and Sentry.

### Phase 4 — Dashboard on real data
1. Move the dashboard onto the site design system and merge it with `/learn`. **(G10)**
2. Real progress, scores and streaks; delete legacy components and CSS.

### Phase 5 — Core product
1. ✅ Learning loop; ✅ categories + AI professors (A); ✅ class-style lessons (B); ✅ Ask the professor (E).
2. **C — Diagrams as code** in lessons (Mermaid / SVG rendered on the page).
3. **D — Illustrations** with GPT-5 Image Mini (max 2 per lesson, cached in Supabase Storage) plus stock photos.
4. **F — Catalog courses and narration** (ready-made courses per category; audio narration).
5. Regenerate lesson / report a problem; course archive and delete; stream lesson text.
6. Doc upload → lessons from the learner's material; module tests, final exam, certificates.
7. Coding practice with AI review; mock interviews; communities; XP and streaks.

### Phase 6 — Payments (Razorpay)
1. ✅ Plans, limits and credit ledger in the database (migration 007); account page shows plan, limits and credits.
2. Razorpay account + KYC 👤; policy pages (Phase 3.2).
3. Credit packs: server-created orders (price from the server), Checkout on the phone, **webhook in a Supabase Edge Function** verifies the signature and adds credits (idempotent per payment).
4. Pro subscription via Razorpay Subscriptions (renewals and cancellations through the same webhook).
5. Payment history and receipts on `/account`.

### Phase 7 — Quality
1. Fix the remaining TS errors (`hero-animation.tsx`) and stop ignoring TS/ESLint in builds. **(G9)**
2. Next 16; drop `auth-helpers-nextjs`; update `recharts`; clear audit highs. **(G12, G15)**
3. Playwright e2e tests and CI on pull requests.

## Decisions log

| Date | Decision |
|------|----------|
| 2026-10-31 | Public site cloned from nxtai.in; Tailwind v4; route groups `(site)`, `(app)`, `(learn)` |
| 2026-10-31 | First product feature = AI learning loop in the nxtai.in design system |
| 2026-10-31 | AI = GPT-6 Luna via OpenRouter; Bedrock path kept for when AWS grants access |
| 2026-10-31 | Hosting on EC2 + Nginx + pm2 at `krpex.in`; Supabase migrations applied by hand |
| 2026-10-31 | No Supabase service_role key on the server; privileged writes go through security-definer functions (and an Edge Function for payments) |
| 2026-11-01 | 9 categories, one labelled AI professor each; lessons generated as typed blocks |
| 2026-11-01 | Ask the professor: lesson-scoped, quotas in Postgres, $2/day global budget |
| 2026-11-01 | Email/password auth runs in the browser (per-learner rate limits) |
| 2026-11-01 | Free / Pro plans + one-time credit packs (₹49/100, ₹99/250, Pro ₹499/month); limits enforced in Postgres |

## Suggested order

Phase 0 (incl. G20) → SMTP (G21) → Phase 3.1–3.2 (prices + policy pages) → Phase 6 (Razorpay) → Phase 5 C/D → Phase 2 items 2–4 → Phase 4 → Phase 7.
