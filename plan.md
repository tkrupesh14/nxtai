# NxtAI — Roadmap

_Last updated: 2026-10-31 · Branch: `dev` · Status of every item lives in [tracker.md](./tracker.md)._

## Where we are

- **Public site** (`app/(site)`): `/`, `/about`, `/pricing`, `/contact`, `/login`, `/create-account` match nxtai.in pixel-for-pixel (light and dark, desktop and mobile). Commit `e71289b`.
- **App** (`app/(app)`): dashboard and legacy `/auth/*` pages still use the old purple dark theme, with Supabase email/password auth.
- **Stack:** Next.js 15.2.4, React 19, Tailwind v4.1.14, Supabase (`dkdkokkzbptjbgjyjkpz`), pnpm.
- **Hosting:** one EC2 box at `http://3.25.236.158`, with Nginx in front of pm2 (`nxtai`, port 3000). HTTP only, no domain, no CI.

## Known gaps (found while building the current version)

| # | Gap | Impact |
|---|-----|--------|
| G1 | GitHub/Google providers are **not enabled** in Supabase ("Unsupported provider") | `/login` and `/create-account` buttons fail |
| G2 | Dashboard requires a row in the custom `users` table. Only email sign-up (`auth/signup/actions.ts`) creates it | OAuth users get bounced to `/auth/login` |
| G3 | Unauthenticated dashboard visits redirect to the **old** `/auth/login`, not the new `/login` | Two login experiences |
| G4 | Auth actions `redirect('/error')`, but there is **no `/error` page** | Failed logins show a 404 |
| G5 | Home pricing (₹0 / ₹699 / ₹2499 per mo) **differs from** `/pricing` (₹0 / ₹499 / ₹1,999 per month), copied as-is from nxtai.in | Conflicting prices for customers |
| G6 | Mobile header has no menu, so About, Pricing, Contact and Log in are unreachable on phones (same as nxtai.in) | Mobile navigation |
| G7 | Footer links (`#platform`, `#features`…) only work on the home page | Dead links on other pages |
| G8 | Contact form has no backend (fake 0.9 s delay) | Messages are lost |
| G9 | `next.config.mjs` ignores TS and ESLint errors; 21 existing TS errors | Bugs can ship silently |
| G10 | Dashboard still uses the old purple theme and the Inter font | Inconsistent with the new brand |
| G11 | HTTP only, IP-based URL, pm2 not started on boot, no Elastic IP | Not production-ready |
| G12 | Deprecated packages: `next@15.2.4`, `@supabase/auth-helpers-nextjs`, `recharts@2.15` | Security and maintenance |

## Phases

### Phase 1 — Make sign-in actually work (P0, about 1–2 days)
Goal: a new visitor can sign up with GitHub or Google and land on a working dashboard.
1. Enable GitHub and Google providers in Supabase. Add `http://3.25.236.158/auth/callback` (and the future domain) to the redirect allow-list. **(G1)**
2. Create the `users` profile row automatically, using either a Postgres trigger on `auth.users` insert or an upsert in `/auth/callback`. Backfill existing auth users. **(G2)**
3. Point every dashboard redirect at `/login`. Decide whether to keep email/password; if yes, add it to the new `/login` design and retire the `/auth/login` and `/auth/signup` pages. **(G3)**
4. Add `app/error.tsx` and a friendly `/error` route; show OAuth errors (`/login?error=oauth`) on the login page. **(G4)**
5. Protect `/dashboard/*` in `middleware.ts` (redirect when there is no session) instead of in each server component.

### Phase 2 — Production hosting (P0/P1, about 1 day)
1. Attach an Elastic IP; point `nxtai.in` (or a staging subdomain) DNS at it. **(G11)**
2. Set up HTTPS with Let's Encrypt (certbot + Nginx) and redirect HTTP to HTTPS. Update the Supabase site URL and redirect URLs.
3. Run `pm2 startup` and `pm2 save` so the app survives reboots; add pm2 log rotation.
4. Add a deploy script (`git pull && pnpm install && pnpm build && pm2 reload nxtai`), then GitHub Actions to deploy on push to `main`.
5. Decide the long-term host: keep EC2, or move to Vercel where nxtai.in runs today.

### Phase 3 — Content and conversion fixes on the public site (P1, about 1 day)
1. Settle on **one** price list and use it on both home and `/pricing`. **(G5)**
2. Add a mobile menu (shadcn `Sheet`) with the nav links and Log in. **(G6)**
3. Make footer links absolute (`/#platform`, `/pricing`, `/contact`). **(G7)**
4. Contact form backend: Supabase `contact_messages` table with RLS (insert-only for anon), plus an email notification. Add the success toast the live site meant to show. **(G8)**
5. SEO basics: favicon, Open Graph image, per-page `<title>`/description, `sitemap.xml`, `robots.txt`.
6. Analytics (Vercel Analytics, Plausible or PostHog) and error tracking (Sentry).

### Phase 4 — Rebrand the dashboard (P1, about 3–5 days)
1. Move the dashboard onto the site design system: blue/neutral tokens, Geist, and shadcn v4 components from `components/site/ui`. **(G10)**
2. Use one shared theme toggle and token set for site and app; delete the legacy theme, the `space-y` compat shim and `tailwindcss-animate`.
3. Remove unused legacy components (`hero-section`, `navbar`, `floating-particles`, `hero-animation` and others) and `styles/globals.css`.

### Phase 5 — Core product features (P1/P2, ongoing)
These are the promises the landing page makes:
1. **Onboarding quiz, then a personal course plan** ("built from a few questions"), generated with Claude.
2. **Bring your own docs**: PDF upload to Supabase Storage, chunking, and AI lessons from the user's own material.
3. **Auto assessments and practice**: quiz generation and grading.
4. **Proctored coding**: sandboxed runner and AI code review.
5. **Mock interviews**: AI interviewer, scoring and feedback.
6. **Communities and events**: event pages, RSVPs, hackathons.
7. **Rewards and streaks**: XP, badges, leaderboard.

### Phase 6 — Payments (P2, after pricing is settled)
1. Razorpay subscriptions for Student Pro and Community Host (INR).
2. Webhooks write plan status to Supabase; gate features by plan.
3. Billing page in the dashboard (plan, invoices, cancel).

### Phase 7 — Quality and maintenance (P1, runs alongside)
1. Fix the 21 TS errors, then turn off `ignoreBuildErrors` / `ignoreDuringBuilds`. **(G9)**
2. Upgrade Next.js to the latest patched release and remove `@supabase/auth-helpers-nextjs`. **(G12)**
3. Add Playwright end-to-end tests (auth flow, contact form) and visual regression tests for the public pages. The comparison script used for the nxtai.in clone is a good base.
4. Run CI on pull requests: typecheck, lint, build and tests.

## Suggested order

Phase 1 → Phase 2 → Phase 3 → Phase 7.1–7.2 → Phase 4 → Phase 5 (start with the onboarding quiz) → Phase 6.
