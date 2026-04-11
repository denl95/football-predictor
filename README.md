# Football Predictor

A Next.js app for predicting football match scores, with a leaderboard and per-user prediction history.

## Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL (see below)
- A Google OAuth app ([console.developers.google.com](https://console.developers.google.com/))

## Database

The app requires a running PostgreSQL instance. The quickest way to get one is Docker:

```bash
docker run -d \
  --name football-predictor-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=football_predictor \
  -p 5432:5432 \
  postgres:16
```

If you already have Postgres running locally (e.g. via Homebrew), just create a database and point `DATABASE_URL` at it.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ADMIN_EMAIL` | Email address allowed to finalise match scores |

3. Run database migrations:

```bash
bun db:migrate
```

4. (Optional) Seed matches:

```bash
bun db:seed
```

5. Start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Production build |
| `bun start` | Start production server |
| `bun lint` | Run Biome linter |
| `bun lint:fix` | Run Biome linter with auto-fix |
| `bun format` | Run Biome formatter |
| `bun db:migrate` | Run Prisma migrations |
| `bun db:seed` | Seed the database |
| `bun db:sync` | Run match sync against football-data.org |
| `bun db:studio` | Open Prisma Studio |

## Deploying to Vercel (free)

The app deploys to **Vercel Hobby (free)** with **Neon Postgres (free)**. Scores sync once per day via Vercel Cron; you can also trigger a sync manually from the Vercel dashboard on match days.

### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project
2. Copy the **pooled connection string** (shown in the Neon dashboard under Connection Details → Pooled connection)

### 2. Import the project to Vercel

1. Push the repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo

### 3. Set environment variables in Vercel

In the Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ADMIN_EMAIL` | Your email address |
| `FOOTBALL_DATA_API_KEY` | football-data.org API key |
| `CRON_SECRET` | `openssl rand -base64 32` |

### 4. Add the Vercel domain to Google OAuth

In [Google Cloud Console](https://console.developers.google.com/) → OAuth client → Authorized redirect URIs, add:

```
https://<your-project>.vercel.app/api/auth/callback/google
```

### 5. Deploy

Trigger a deploy — the build command runs `prisma migrate deploy` automatically, so the database schema is applied on every deploy.

### 6. Seed fixtures

Run the seed script once against the production database:

```bash
DATABASE_URL="<neon-pooled-url>" bun db:seed
```

### 7. Sync scores

Scores sync automatically every day at 06:00 UTC. To trigger an immediate sync:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://<your-project>.vercel.app/api/cron/sync
```

Or use the **Cron Jobs** tab in the Vercel dashboard to run it on demand.

## Points System

| Result | Points |
|--------|--------|
| Exact score | 3 |
| Correct goal difference | 2 |
| Correct winner or draw | 1 |
| Wrong | 0 |
