# NxtAI — Roadmap

_Last updated: 2026-11-01 · Branch: `dev` · Live: https://krpex.in · Task status lives in [tracker.md](./tracker.md)._

## Where we are

- **Public site** (`app/(site)`): `/`, `/about`, `/pricing`, `/contact`, `/login`, `/create-account` match nxtai.in (light/dark, desktop/mobile). Added a mobile menu, working footer links, a `/error` page, and a contact form that saves to Supabase.
- **AI learning loop** (`app/(learn)`, new design system): `/onboarding` quiz → AI course plan → `/learn` course list → course outline with ordered unlocking → lessons written on first open (Markdown, takeaways, quiz) → server-graded quiz (60% to pass) unlocks the next lesson.
- **AI provider:** GPT-6 Luna ($0.10 / $0.50 per 1M tokens) through **OpenRouter** (`lib/ai/llm.ts`). The Amazon Bedrock path is built but blocked: the AWS account has no access to third-party models yet (support case open). Measured: course plan ~14 s, lesson ~35 s, ~₹4–5 per 20-lesson course.
- **Auth:** Supabase. GitHub OAuth enabled; Google not yet. Email/password still uses the old `/auth/*` pages. Middleware protects `/dashboard`, `/learn`, `/onboarding`. Profile rows are created by a DB trigger and on OAuth callback.
- **Database (Supabase `dkdkokkzbptjbgjyjkpz`):** `users` (+ `on_auth_user_created` trigger), `contact_messages`, `learner_profiles`, `courses`, `course_modules`, `lessons`, all with RLS. SQL lives in `supabase/migrations/` and is applied by hand in the SQL editor.
- **Dashboard** (`app/(app)/dashboard`): still the old purple theme with **hard-coded sample data** on every page; its "Courses" link now goes to `/learn`.
- **Stack:** Next.js **15.5.28**, React 19.3, Tailwind v4.1.14, Supabase, OpenAI SDK (OpenRouter/Bedrock), pnpm.
- **Hosting:** one EC2 instance (Sydney), Elastic IP `54.79.194.65`, domain **krpex.in** (DNS at Hostinger), Let's Encrypt HTTPS with auto-renew, Nginx → pm2 (`nxtai`, port 3000). Pushes go to GitHub with a repo-scoped deploy key.

## Security incident (2026-10-31)

Next.js 15.2.4 had a React Server Components remote-code-execution flaw. Between 21:46 and 22:58 UTC, automated scanners (`102.220.161.89`, `176.65.144.34`) sent 5 exploit requests that dumped the server's environment variables. Exposed: the Supabase anon key (public by design) and a Claude Code session token. The Bedrock key was not in the dumps but was on disk, so it is treated as exposed. No persistence was found (cron, SSH keys, processes, files, connections).
**Done:** upgraded to Next 15.5.28 / React 19.3.1, restarted pm2 with a clean environment. **Still to do:** see Phase 0.

## Known gaps

| # | Gap | Status |
|---|-----|--------|
| G1 | OAuth providers not enabled | 🟡 GitHub done; Google pending |
| G2 | OAuth users had no `users` row → bounced from dashboard | ✅ Trigger + callback create it |
| G3 | Dashboard redirected to old `/auth/login` | ✅ Goes to `/login?next=…` |
| G4 | No `/error` page | ✅ Added |
| G5 | Home pricing (₹699/₹2499) ≠ `/pricing` (₹499/₹1,999) | ⬜ Needs a business decision |
| G6 | No mobile menu | ✅ Added |
| G7 | Footer anchors broken off the home page | ✅ Fixed |
| G8 | Contact form had no backend | 🟡 Saves to Supabase; no email notification |
| G9 | TS/ESLint errors ignored in builds (20 TS errors) | ⬜ |
| G10 | Dashboard on old theme with sample data | ⬜ |
| G11 | No domain/HTTPS/static IP; pm2 not on boot | 🟡 Domain, HTTPS, Elastic IP done; pm2 startup + log rotation pending |
| G12 | Outdated packages | 🟡 Next patched; `@supabase/auth-helpers-nextjs`, `recharts` 2.x, Next 16 pending |
| G13 | Secrets pasted in chat / possibly exposed | ⬜ Rotate OpenRouter key, delete Bedrock key, revoke old GitHub PAT, restart Claude Code session |
| G14 | AWS account can't use third-party Bedrock models | ⛔ AWS support case (Marketplace Buyer Request) open |
| G15 | `pnpm audit`: PostCSS (build-time) and Zod highs | ⬜ Bump when compatible |
| G16 | AI cost controls are minimal (3 courses/day only) | ⬜ Spending cap, per-lesson limits, usage log |
| G17 | Learning loop not yet verified by a real user in the browser; no automated tests | ⬜ |
| G18 | Site navbar shows "Log in" when already signed in | ⬜ |
| G19 | Email/password sign-in still on old purple `/auth/*` pages | ⬜ |

## Phases

### Phase 0 — Security follow-up (P0, now)
1. Rotate the OpenRouter key and set a monthly spending limit; delete the Bedrock API key and its IAM user; revoke the GitHub PAT used earlier. **(G13)**
2. Restart the Claude Code session (token was exposed).
3. Decide: keep this instance (patched, no persistence found) or rebuild a fresh one from the repo.
4. Turn on GitHub Dependabot security alerts and updates for the repo.
5. Add basic Nginx hardening: rate limits on `POST`, block known scanner paths; consider AWS WAF or Cloudflare in front.
6. Move AI keys out of `.env.local` into a secret store or an EC2 IAM role (Bedrock) once access is approved.

### Phase 1 — Sign-in (mostly done)
1. ✅ GitHub OAuth; profile row creation; redirects to `/login`; `/error`; middleware protection.
2. Enable Google OAuth (Google Cloud OAuth client → Supabase). **(G1)**
3. Rebuild email/password sign-in in the new design on `/login` and `/create-account`, then retire the `/auth/*` pages. **(G19)**
4. Show the signed-in state in the site navbar ("My courses" / avatar instead of "Log in"). **(G18)**

### Phase 2 — Production hosting
1. ✅ Elastic IP, `krpex.in` DNS, HTTPS with auto-renew, Nginx timeouts and header buffers.
2. Run `pm2 startup` + `pm2 save`; add `pm2-logrotate`. **(G11)**
3. Deploy script (`git pull && pnpm install && pnpm build && pm2 reload nxtai`), then GitHub Actions deploy over SSH on push.
4. Uptime monitoring and alerts (e.g. UptimeRobot / Better Stack); Supabase backups.
5. Decide long-term host (EC2 vs Vercel).

### Phase 3 — Public site
1. One price list for home and `/pricing`. **(G5)**
2. Contact form email notification (Resend/SES) and a dashboard view of messages. **(G8)**
3. SEO: favicon, OG image, per-page metadata, `sitemap.xml`, `robots.txt`.
4. Analytics and error tracking (PostHog or Plausible; Sentry).

### Phase 4 — Dashboard on real data
1. Bring the dashboard onto the site design system (blue/Geist) and merge it with `/learn`. **(G10)**
2. Replace sample data with real data from `courses`/`lessons`: progress, time studied, quiz scores, streaks.
3. Delete unused legacy components and CSS, the `space-y` compat shim and `tailwindcss-animate`.

### Phase 5 — Core product
1. **Learning loop polish (next):** verify end-to-end with real users **(G17)**; "regenerate lesson" and "report a problem"; stream lesson text as it is written; course archive/delete; per-user AI usage log and limits **(G16)**.
2. Bring your own docs: PDF upload to Supabase Storage → lessons from the learner's material.
3. Standalone assessments: module tests and a final exam, with certificates.
4. Proctored coding practice with AI code review.
5. AI mock interviews.
6. Communities, events, hackathons.
7. XP, badges, streaks, leaderboard.

### Phase 6 — Payments (after G5)
1. Razorpay subscriptions for Student Pro and Community Host.
2. Webhooks → plan status in Supabase; gate features (e.g. courses per month) by plan.
3. Billing page.

### Phase 7 — Quality
1. Fix the 20 TS errors and stop ignoring TS/ESLint in builds. **(G9)**
2. Upgrade to Next 16, remove `@supabase/auth-helpers-nextjs`, update `recharts`, clear `pnpm audit` highs. **(G12, G15)**
3. Playwright e2e tests: sign-in, onboarding → course → lesson → quiz, contact form; visual regression for public pages.
4. CI on pull requests: typecheck, lint, build, tests.

## Decisions log

| Date | Decision |
|------|----------|
| 2026-10-31 | Public site cloned from nxtai.in; Tailwind v4; route groups `(site)`, `(app)`, `(learn)` with separate root layouts |
| 2026-10-31 | First product feature = AI learning loop; new screens use the nxtai.in design system |
| 2026-10-31 | AI model = GPT-6 Luna (cheapest current GPT, $0.10/$0.50) — via OpenRouter for now; Bedrock path kept for when AWS grants access; switch by which key is set, override with `AI_MODEL` |
| 2026-10-31 | Hosting on EC2 + Nginx + pm2 at `krpex.in`; Supabase migrations applied by hand |
| 2026-10-31 | GitHub access from the server via a repo-scoped deploy key (no tokens in chat) |

## Suggested order

Phase 0 → finish Phase 1 and Phase 2 items 2–4 → Phase 5.1 (verify + polish the learning loop) → Phase 4 (dashboard on real data) → Phase 3 → Phase 7 → Phase 6 once pricing is settled.
