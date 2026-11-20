# Earn

A simple daily reporting app built with Next.js, Prisma, Neon PostgreSQL, and Better Auth. Dark/light mode, secure login, role permissions, and PDF export are included.

There are only **three business record types**:

| Section            | Fields you enter                   |
| ------------------ | ---------------------------------- |
| Salary             | Date, Net Salary                   |
| Cash flow expenses | Date, Net Amount                   |
| Production         | Date, Daily Production, Total Earn |

Each section has one total per date. Enter final amounts directly: there is no employee setup, unit-rate calculation, category selection, or payment-status workflow. Cash flow Net Amount is expense-only, meaning money paid out. All amounts use **৳**.

**Net Balance = Total Earn − Net Salary − Cash Flow Expenses.** Monthly reports add up the daily records. This is a simple income-and-cost summary, not a bank reconciliation or full accounting ledger.

## Run locally

Node.js 24 is required.

```bash
npm ci
cp .env.example .env.local
```

Set the private `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `ADMIN_SETUP_KEY` in `.env.local`. Keep `DATABASE_SCHEMA=earn` for production and use a separate Neon branch or disposable schema for development.

```bash
npm run db:migrate
npm run dev
```

For a new installation, open `/setup` and create the first administrator with the private setup key. Existing accounts continue to work. Admins manage other members from **Users & roles**. Public sign-up is disabled.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The complete browser check uses an empty disposable schema and localhost:

```bash
DATABASE_SCHEMA=earn_test_simple npm run db:migrate
DATABASE_SCHEMA=earn_test_simple BETTER_AUTH_URL=http://localhost:3001 npm run dev -- --port 3001
# In another terminal:
DATABASE_SCHEMA=earn_test_simple TEST_BASE_URL=http://localhost:3001 node --env-file=.env.local scripts/verify-e2e.mjs
```

Playwright needs an installed Chromium runtime or `CHROMIUM_PATH`. Environments using an HTTPS proxy may need `NODE_USE_ENV_PROXY=1`. The guarded reset script removes only schemas beginning with `earn_test_`.

## Schema and migration

[System design](docs/ARCHITECTURE.md) · [Prisma schema](prisma/schema.prisma) · [Verification](docs/VERIFICATION.md)

The three Prisma business models expose the requested fields, plus IDs, timestamps, creator identity, and void history. Better Auth's identity tables remain separate. Migration `202611200004_simple_daily_records` removes required legacy employee/rate fields, consolidates older active records by date, and retains original rows/columns for recovery. Old Employee/Expense tables are no longer used by the application. Existing raw columns are mapped with Prisma `@map` so deployed schema changes remain compatible.

Use `npm run db:migrate` with the checked-in SQL and its checksum ledger. The build generates Prisma but does not apply migrations. Do not mix this runner with Prisma's separate migration history without a deliberate baseline conversion.

## Deploy

[Production application](https://earn-ochre.vercel.app) · Vercel project `earn`, team `shakils-projects-439f6ed3`.

Use the existing production environment variables, Node.js 24, and the Next.js preset. Apply migrations before deploying code that uses the new schema. Vercel deployment protection remains enabled. GitHub app access is needed before automatic Git deployments can be connected; direct source upload is used for these releases.
