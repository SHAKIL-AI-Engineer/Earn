# Earn

A Next.js admin dashboard for daily production, daily-rate salaries, expenses, cash flow, daily reports and monthly summaries. Includes light/dark themes, interactive entry forms, paginated records, Better Auth login, four server-enforced roles, Prisma ORM, Neon PostgreSQL, audit history and server-generated PDF reports with an interactive preview.

**Start with the [system design and architecture](docs/ARCHITECTURE.md).** It explains the domain model, role matrix, accounting rules, API boundaries, deployment and operational limitations. [Editable system diagram](docs/architecture-diagrams.md).

## Run locally

Requires Node.js 24 and a Neon PostgreSQL database.

```bash
npm ci
cp .env.example .env.local
```

Fill `.env.local` with your private `DATABASE_URL`, a random `BETTER_AUTH_SECRET`, a different random `ADMIN_SETUP_KEY`, and your local `BETTER_AUTH_URL`. Keep these files private and out of Git. Set `DATABASE_SCHEMA=earn` for the application's dedicated schema. For development against production data, first use a separate Neon branch.

```bash
npm run db:migrate
npm run dev
```

Open `/setup`, enter the setup key, and choose the workspace name, opening date and first administrator's email/password. No default login is shipped. Setup closes after the workspace is created. Sign in at `/login`. Administrators create member accounts and assign Admin, Manager, Accountant or Viewer from **Users & roles**. Administrators can reset passwords; email recovery is not configured.

For this workspace, the one-time key is also available in the private, ignored `.admin-setup.txt` file. Do not upload or commit that file.

## Daily workflow

1. Add employees and their daily rates.
2. Record production quantity and unit rate. Earnings are calculated on the server.
3. Record salaries using days worked × the saved rate; fractional days are supported.
4. Add operating expenses. Mark receipts/payments with their actual payment dates.
5. Use cash adjustments only for owner contributions and withdrawals; paid production, expenses and salaries already enter cash flow automatically.
6. Choose a day or month. Export a summary or detailed PDF, select sections and orientation, generate a preview, and download that exact report.

Amounts are USD. Net earnings deduct both operating expenses and salaries. Cash flow uses payment dates, so it can differ from earnings. Voiding an entry removes it from totals while preserving its original record and audit history. Updates detect stale edits rather than silently overwriting them.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

End-to-end verification writes only to an isolated test schema. Start the app with matching test schema and auth URL, then run the script against localhost:

```bash
DATABASE_SCHEMA=earn_test_local npm run db:migrate
DATABASE_SCHEMA=earn_test_local BETTER_AUTH_URL=http://localhost:3001 npm run dev -- --port 3001
# In another terminal, load .env.local and run:
DATABASE_SCHEMA=earn_test_local TEST_BASE_URL=http://localhost:3001 node --env-file=.env.local scripts/verify-e2e.mjs
```

Install a Playwright Chromium runtime (`npx playwright install chromium`) or set `CHROMIUM_PATH`. The test requires a fresh `earn_test_` schema; the guarded `scripts/reset-test-db.ts` can remove only schemas with that prefix. Never use a production schema for fixtures. Environments with an HTTPS proxy may need `NODE_USE_ENV_PROXY=1` for Node fetch.

## Database migrations

Prisma 7 defines the schema and generates the client. Versioned SQL migrations are in `prisma/migrations`. The migration runner uses Neon HTTPS, a transaction, an advisory lock, and the `_earn_migrations` checksum ledger. Use `npm run db:migrate`; do not mix it with Prisma's separate migration history without a deliberate baseline conversion. Migrations do not run during the build. See the architecture document before adding procedural SQL or changing existing financial fields.

## Deployment

Production: [Earn](https://earn-ochre.vercel.app), Vercel project `earn`, team `shakils-projects-439f6ed3`.

Required production variables: `DATABASE_URL`, `DATABASE_SCHEMA=earn`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://earn-ochre.vercel.app`, and `ADMIN_SETUP_KEY` until initial setup is complete. Use Node.js 24 and the Next.js preset. `npm run build` generates Prisma before building Next.js. Migrate the database before deploying code that requires the new schema.

Vercel's GitHub app must be granted repository access before automatic Git deployments can be enabled. Direct source upload is used for the initial releases. Vercel deployment protection remains enabled; application login is a separate layer.

The first release supports one workspace, full-payment records, USD, and 2,000 detail rows per PDF section. It does not implement tax accounting, multi-currency, approval workflows, immutable monthly close, or self-service email password recovery. See the architecture document for growth and backup/restore considerations.
