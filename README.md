# Finance Dashboard

Personal money management app with retrospective spending analysis, AI categorization, and email reports.

## Features

- **SimpleFin Bridge** — connects to your bank accounts automatically
- **Retrospective analytics** — spending breakdowns for 1mo / 3mo / 6mo / 12mo periods
- **Income vs expenses** — monthly trend charts, net cash flow, outlier detection
- **AI categorization** (Claude) — auto-categorizes transactions with confidence score; flags low-confidence items for review
- **Learning** — correcting a categorization creates a rule so similar transactions auto-categorize correctly
- **Email reports** — weekly digest + monthly summary; fully configurable frequency, periods, sections
- **Multi-device** — responsive dark-mode web app, works on phone, tablet, desktop

## Quick Start (local)

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL (Supabase recommended)

# 3. Push schema to database
npm run db:push

# 4. Seed with 6 months of demo data
npm run db:seed

# 5. Start dev server
npm run dev
```

Open http://localhost:3000 — default password: `demo1234`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Your app URL |
| `APP_PASSWORD` | Yes | Login password |
| `SIMPLEFIN_ACCESS_URL` | No | SimpleFin Bridge access URL |
| `ANTHROPIC_API_KEY` | No | Claude API key (for AI categorization) |
| `RESEND_API_KEY` | No | Resend.com API key (for email reports) |
| `REPORT_FROM_EMAIL` | No | Email sender address |
| `CRON_SECRET` | No | Secret for securing `/api/cron` endpoint |
| `NEXT_PUBLIC_APP_URL` | No | Public URL (for email links) |

## Deployment (Vercel + Supabase)

1. **Create Supabase project** → Settings → Database → Connection String (Transaction mode)
2. **Push schema**: `DATABASE_URL=... npm run db:push`
3. **Seed demo data**: `DATABASE_URL=... npm run db:seed` (or skip for production)
4. **Deploy to Vercel**, add all env vars
5. **Cron**: `vercel.json` configures a daily cron at `GET /api/cron` — set `CRON_SECRET` and Vercel calls it automatically

## SimpleFin Setup

1. Go to https://beta-bridge.simplefin.org/simplefin/claim
2. Copy the one-time claim URL  
3. POST to it: `curl -X POST "<claim-url>"` → you get back your access URL
4. Set `SIMPLEFIN_ACCESS_URL` to the returned URL
5. Go to Settings → "Sync Now"

## Using the App

- **Overview**: Dashboard with 3-month snapshot, review queue, recent transactions
- **Transactions**: Full transaction list with search, category filter, inline recategorization
- **Analytics**: Period selector (1m/3m/6mo/12m/YTD), category breakdown, trend charts, outlier detection
- **Categories**: Manage categories; Review Queue tab shows all low-confidence categorizations
- **Reports**: Toggle weekly/monthly defaults; create custom reports with configurable periods and sections; send test emails
- **Settings**: Connect SimpleFin, sync accounts, adjust AI confidence threshold
