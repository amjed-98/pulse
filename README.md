# Pulse

Pulse is a portfolio SaaS dashboard built with Next.js 15, React 19, Tailwind CSS v4, and Supabase SSR. It includes a public marketing site, protected dashboard routes, Supabase auth, server actions, row-level security, charts, and responsive team/project management flows.

## Features

- Public marketing site plus protected dashboard routes
- Email/password authentication with Supabase SSR
- Analytics overview with responsive charts
- Project management with server actions for create, update, and delete
- Team management with invites and role-aware UI
- Settings flows for profile updates, password changes, and account deletion
- Tailwind CSS v4 design system with responsive dashboard layout

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

4. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Supabase Setup

Run the SQL in `supabase/migrations/001_initial.sql` against your Supabase project, or use the Supabase CLI migration workflow if you have it configured.

Important notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for team invites and account deletion.
- The app uses RLS as the primary data access control layer.
- Auth session refresh is handled in `middleware.ts` via `@supabase/ssr`.

## Scripts

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

## Project Structure

```text
app/                App Router pages and layouts
components/         UI, auth, and dashboard components
lib/                actions, Supabase clients, shared types, seed data, helpers
supabase/           SQL migration files
middleware.ts       session refresh and route protection
```

## Verification

The project was verified with:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

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
