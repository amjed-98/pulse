# Pulse

Pulse is a portfolio SaaS dashboard built with Next.js 15, React 19, Tailwind CSS v4, and Supabase SSR. It includes a public marketing site, protected dashboard routes, Supabase auth, server actions, row-level security, charts, and responsive team/project management flows.

## Features

- Public marketing site plus protected dashboard routes
- Email/password authentication with Supabase SSR
- Analytics overview with responsive charts
- Project management with server actions for create, update, and delete
- Team management with invites and role-aware UI
- Settings flows for profile updates, password changes, and account deletion
- Workspace billing with plan limits, Stripe Checkout, and Billing Portal integration
- Tailwind CSS v4 design system with responsive dashboard layout
- Audit logging and activity timelines backed by Supabase
- Role-aware project collaboration and workspace invite lifecycle
- Health checks, CI verification, environment validation, and abuse throttling

## Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- Supabase with `@supabase/ssr`
- Recharts
- Framer Motion v11
- React Hook Form + Zod

## Requirements

- Node.js 20+
- `pnpm` 10+
- A Supabase project

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Set these variables in `.env.local`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_GROWTH_MONTHLY`
- `STRIPE_PRICE_SCALE_MONTHLY`

4. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Supabase Setup

Run the SQL in `supabase/migrations/001_initial.sql` against your Supabase project, or use the Supabase CLI migration workflow if you have it configured.

Important notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for team invites and account deletion.
- Stripe billing is optional locally, but production checkout and portal flows require the Stripe env vars above.
- The app uses RLS as the primary data access control layer.
- Auth session refresh is handled in `middleware.ts` via `@supabase/ssr`.

### GitHub Actions Migration Pipeline

The repository includes a dedicated GitHub Actions workflow at [.github/workflows/supabase-migrations.yml](/home/amjad/Desktop/projects/pulse/.github/workflows/supabase-migrations.yml).

It does two things:

- On pull requests touching `supabase/migrations/**`, it validates migration ordering and runs a local `supabase db reset --local`.
- On pushes to `main` or manual dispatch, it pushes unapplied migrations to your remote Supabase database.

Set these GitHub repository or environment secrets before enabling the deploy job:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_URL` or `SUPABASE_ACCESS_TOKEN`

Recommended setup:

- Prefer `SUPABASE_DB_URL` with the exact Supabase session-pooler connection string for your production database.
- If you prefer linked-project mode instead, set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`, and the workflow will use `supabase link` followed by `supabase db push --linked`.

Example `SUPABASE_DB_URL` shape:

```text
postgresql://postgres.<project-ref>:YOUR_DB_PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
```

## Scripts

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

## Environment Validation

Pulse validates required public environment variables at boot through a shared env module. If `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are malformed or missing, the app fails fast instead of surfacing vague runtime errors later.

`SUPABASE_SERVICE_ROLE_KEY` is optional, but some features degrade without it:

- workspace invites
- account deletion
- deep database health probing

Stripe env vars are also optional, but billing falls back to preview-mode plan switching when they are absent.

## Project Structure

```text
app/                App Router pages and layouts
components/         UI, auth, and dashboard components
lib/                actions, Supabase clients, shared types, seed data, helpers
supabase/           SQL migration files
middleware.ts       session refresh and route protection
```

## Architecture Notes

- Authentication is enforced in middleware and RSC layouts, not in client components.
- All mutations use Next.js Server Actions with Supabase SSR clients.
- Authorization is enforced twice: UX-level gating in the dashboard and RLS in Postgres.
- Audit logs and analytics events are separate concerns:
  - `audit_logs` capture operator-facing activity history.
  - `analytics_events` capture product instrumentation and KPI signals.
- Empty workspaces do not pretend to have live data:
  - overview can show explicit preview mode
  - projects and analytics use guided empty states for real onboarding
- Team administration supports:
  - pending invites with assigned roles
  - accepted invite role propagation on signup
  - admin role changes and revocation flows
- Workspace billing supports:
  - preview-mode plan switching without Stripe
  - Stripe-hosted subscription upgrades
  - Billing Portal handoff and webhook-based subscription sync

## Production Work Added

- Structured server logging with reference IDs
- App Router error boundaries and auth callback hardening
- Shared toast feedback across mutation-heavy screens
- Rate limiting for auth, invites, and destructive admin actions
- `/api/health` runtime probe
- GitHub Actions CI for lint, typecheck, and build
- Environment validation through a shared config module

## Verification

The project was verified with:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

The repository also includes GitHub Actions CI in [.github/workflows/ci.yml](/home/amjad/Desktop/projects/pulse/.github/workflows/ci.yml) to run the same checks on pushes and pull requests.

## Demo Behavior

If your Supabase tables are empty, the dashboard falls back to realistic seed data so the portfolio experience still looks populated.

## Deployment

Deploy on Vercel with:

- Install command: `pnpm install`
- Build command: `pnpm build`
- Framework preset: Next.js

Set the same environment variables from `.env.local` in your Vercel project and configure the Supabase auth callback URL to:

```text
https://your-domain.com/auth/callback
```

## Health Check

Pulse exposes a runtime health endpoint at:

```text
/api/health
```

It reports:

- env configuration status
- database probe status
- degraded mode when the service role key is intentionally absent

## Stripe Billing Setup

If you want live billing instead of local preview billing:

1. Create recurring Stripe prices for the `growth` and `scale` plans.
2. Add their price IDs to:
   - `STRIPE_PRICE_GROWTH_MONTHLY`
   - `STRIPE_PRICE_SCALE_MONTHLY`
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
4. Point your Stripe webhook endpoint to:

```text
https://your-domain.com/api/stripe/webhooks
```

Recommended webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
