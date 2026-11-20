# Earn

A Next.js App Router starter with TypeScript, a responsive home page, and a server-side Neon PostgreSQL connection. Built for Vercel on Node.js 24.

## Local development

```bash
npm ci
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local` to your pooled Neon connection string, then run:

```bash
npm run dev
```

Open http://localhost:3000 and select **Test connection**. The app calls `GET /api/health`, executes `SELECT 1` on PostgreSQL, and displays the measured query latency. This starter does not create tables or modify existing data.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only pooled Neon PostgreSQL URL. Never prefix it with `NEXT_PUBLIC_`. |

Keep `.env.local` out of Git. Configure `DATABASE_URL` as a production secret in Vercel before deploying. Use a separate Neon development branch for local feature work and a separate preview branch before enabling database access in preview deployments. Rotate credentials in Neon and update both the local file and Vercel secret when needed.

The database module uses the official `@neondatabase/serverless` driver over HTTPS, with a fresh ten-second timeout per request. Queries do not require persistent TCP connections. The health route returns only connection status, duration, and timestamp; raw driver errors and credentials are never sent to the browser. Add authentication and authorization before implementing private data features.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Deployment

Vercel project: `earn` in `shakils-projects-439f6ed3`.

Deploy with the Next.js preset and Node.js 24, and set `DATABASE_URL` for production. The initial deployment uses direct source upload because Vercel's Git integration could not access this repository. To enable automatic deployments, grant Vercel's GitHub app access to `SHAKIL-AI-Engineer/Earn`, then connect the repository in the project's Git settings with `main` as the production branch. With an authenticated Vercel CLI you can also deploy manually:

```bash
npx vercel link --project earn --scope shakils-projects-439f6ed3
npx vercel --prod
```

Vercel deployment protection may require sign-in with an authorized Vercel account.
