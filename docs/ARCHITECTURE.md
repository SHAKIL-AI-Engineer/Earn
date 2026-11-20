# Earn: system design and architecture

Earn is a single-business operations and reporting application. It records production earnings, daily-rate salaries, operating expenses, and actual cash activity. The application is deployed as a modular Next.js monolith on Vercel, with Prisma 7 and Neon PostgreSQL. Better Auth owns password verification and sessions. Reports are generated from server-side calculations and streamed as private PDFs.

This is a working first release, not a complete general ledger, tax system, or multi-tenant accounting platform. All amounts are USD; reporting calendar dates follow Asia/Dhaka. See [the editable architecture diagrams](architecture-diagrams.md), [canonical diagram source](architecture-diagrams.json), and [structural preview](architecture-preview.svg). The diagram was statically validated; the preview is a structural SVG, not evidence from a native Mermaid renderer.

## System boundaries

| Layer         | Responsibilities                                                                                    | Implementation                                 |
| ------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Presentation  | Responsive sidebar/navigation, date and status filters, forms, charts, theme, PDF preview           | React client components under `src/components` |
| Identity      | Email/password verification, hashed passwords, session cookies, database-backed login rate limiting | Better Auth; Prisma adapter                    |
| Authorization | Validate session and current user active status/role on every private API                           | `src/lib/http.ts`, `permissions.ts`            |
| Application   | Validate input, calculate amounts, enforce invariants, detect stale updates                         | `validation.ts`, `records.ts`                  |
| Reporting     | Consistent income/cost/cash aggregates and daily trends                                             | `reports.ts`                                   |
| Persistence   | Decimal financial fields, foreign keys, partial unique salary index, transactional audits           | Prisma schema and SQL migrations               |
| Delivery      | Authorized PDF generation, page numbers, private response headers                                   | `/api/export`, `report-pdf.tsx`                |

Browser → session cookie → API authorization → Zod validation → business service → Prisma transaction → Neon. A financial write and its audit record commit together. The browser never receives database credentials or password hashes. `scripts/db-runtime.ts` supplies a bounded Neon connection pool; WebSockets support interactive PostgreSQL transactions. The proxy agent is used only when the execution environment supplies an HTTPS proxy.

## Domain model and ownership

| Model                                        | Main fields and relations                                           | Invariants                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Workspace                                    | Name, currency, timezone, opening cash/date                         | Single row `default`; USD and calendar fixed for this release                 |
| User                                         | Name, email, role, active                                           | Unique email; role constraint; at least one active administrator              |
| Session / Account / Verification / RateLimit | Better Auth identity and session data                               | Session/account user foreign keys; private; no public sign-up                 |
| Employee                                     | Code, name, position, daily rate, active                            | Unique code; positive rate; deactivate rather than delete                     |
| Production                                   | Date, description, quantity, unit rate, amount, payment date        | Positive inputs; amount computed on server; may be unpaid                     |
| Salary                                       | Employee FK, date, days worked, rate snapshot, amount, payment date | Days > 0 and ≤ 1; one nonvoided employee/day; snapshot rate preserves history |
| Expense                                      | Date, category, description, amount, payment date                   | Positive amount; category allowlist; salaries recorded separately             |
| CashEntry                                    | Date, direction, description, amount                                | Positive amount; IN/OUT; owner contributions/withdrawals only                 |
| AuditLog                                     | Actor, action, entity ID, before/after, timestamp                   | Written in same transaction as change; no passwords/secrets                   |

Tables live in the dedicated `earn` schema and use `earn_` prefixes. This isolates the new application tables from pre-existing public tables. Financial rows contain `voidedAt` rather than being deleted. Audit references preserve actor identity even if a user later changes their display name.

## Accounting and calendar rules

- Production earnings = quantity × unit rate. Daily salary = daily rate × days worked. Each entry is rounded half-up to two decimal places using decimal arithmetic; PostgreSQL uses `DECIMAL`, never floating-point money.
- Net earnings = production earnings − operating expenses − salaries. Owner contributions and withdrawals do not change earnings.
- A record's entry date determines its daily/monthly earnings and cost period. The nullable `paidOn` date determines its cash period. Payment dates cannot precede entry dates; partial payments and prepayments are outside the first release.
- Cash in = production payments + manual IN adjustments. Cash out = paid expenses + paid salaries + manual OUT adjustments.
- Opening cash for a selected period = workspace opening cash + all earlier receipts − all earlier payments. Closing cash = opening cash + period cash in − period cash out. Negative balances are shown explicitly.
- Unpaid receivable/payable cards cover entries originating in the selected period, not a full aged outstanding balance. Future-dated payments do not enter the cash book until their payment period.
- A report uses `[start, end)` calendar boundaries. Dates are PostgreSQL `DATE` fields normalized to midnight UTC for transport; timestamps are instants. Month changes, leap dates, and salary fractions are validated.
- Entries cannot precede the configured opening date. Opening cash represents the balance at that date. An administrator changing opening cash changes historical cash balances and creates an audit event.

## Permissions

| Capability                                                     | Admin | Manager | Accountant | Viewer |
| -------------------------------------------------------------- | ----- | ------- | ---------- | ------ |
| Read business dashboard and financial records                  | Yes   | Yes     | Yes        | Yes    |
| Production writes                                              | Yes   | Yes     | No         | No     |
| Employee/rate writes                                           | Yes   | Yes     | No         | No     |
| Salary writes                                                  | Yes   | Yes     | Yes        | No     |
| Expense and cash adjustment writes                             | Yes   | No      | Yes        | No     |
| PDF export                                                     | Yes   | Yes     | Yes        | No     |
| User accounts, roles, password reset, settings, audit activity | Yes   | No      | No         | No     |

UI controls follow the same matrix, but APIs enforce it independently. A hidden button is not an access control. Every request reads current user status/role from PostgreSQL. Disabling a user or changing role/password revokes their sessions. The last active administrator cannot be demoted or disabled. User management serializes this check using a transaction-scoped advisory lock.

## Identity and first administrator

Better Auth handles credentials and sessions. Sign-up is disabled. Administrators provision accounts with library-generated password hashes and a credential account row inside a transaction; passwords are not added to audit snapshots. Passwords require at least 12 characters. Login is rate limited with counters stored in PostgreSQL, so serverless instances share the limits. Sessions expire after seven days and are checked server-side.

`/setup` requires the random `ADMIN_SETUP_KEY` stored as a server secret. The workspace singleton and first administrator are created atomically. Competing requests cannot create multiple initial workspaces. Setup stops accepting new administrators after initialization. The private `.admin-setup.txt` contains the key for the owner; it is ignored by Git and excluded from deployments. Remove the setup key from Vercel after initialization if desired. No default credentials are shipped.

No password reset email provider is configured. An administrator can reset another member's password and revoke sessions. Lost access to the only admin requires an operator with trusted database access; do not add a public emergency reset route. Configure a verified email service before adding self-service password recovery or email verification.

## API contracts and concurrency

- `POST /api/setup`: one-time protected workspace/admin initialization.
- `/api/auth/*`: Better Auth sign-in, sign-out, session handling; public registration is disabled.
- `GET /api/workspace`: authorized period summary, paginated records, employee selector, admin-only recent activity. Supports `period`, `day`, `month`, `kind`, `search`, `status`, `category`, `page`.
- `POST/PATCH/DELETE /api/records/:kind`: create, update, or void validated records. The server derives amounts and actor identity. Creates use a per-form UUID for duplicate prevention. Updates require the previously read `updatedAt`; stale edits return 409.
- `GET/POST/PATCH /api/team`: administrator-only account list, creation, role/status changes and password resets. Does not return credentials or sessions.
- `PATCH /api/settings`: administrator-only workspace name/opening-cash update with optimistic concurrency.
- `GET /api/export`: role-checked PDF stream with period, sections, summary/detail, and orientation options. Private/no-store and attachment headers.
- `GET /api/health`: minimal database readiness; exposes no query data or connection string.

Cookie-authenticated business mutations require a matching Origin. All private responses use `Cache-Control: private, no-store`. Input bodies have a size limit; string lengths, dates, currencies and enum-like fields are validated. Raw database errors are not returned to clients. Schema constraints provide a second integrity boundary beyond the API.

Reporting aggregates run in a repeatable-read transaction. PDF summary and detail use the same transaction snapshot; PDF rendering happens after the database transaction finishes. A later record mutation can produce a newer result in a subsequent report, as expected. Closing periods and permanently stored immutable report snapshots are a future enhancement.

## Reports and PDF design

Daily and monthly reports share the reporting service. The export dialog has daily/monthly selectors, a date/month picker, summary/detailed content, section toggles, A4 portrait/landscape, a preview, and a download button. Preview generation returns the same PDF blob that is downloaded. The PDF contains organization and currency, period, earnings/cost/net cards, a cash statement, selected detail tables, notes, confidentiality footer, and page numbers. Tables can continue across pages without splitting rows.

The PDF generator is server-side and uses built-in fonts. It does not depend on a browser print dialog, remote font downloads, or headless Chromium in production. A detailed section is limited to 2,000 rows; larger exports must use a daily report or summary-only mode. Paginated application tables show 20 records per page; numeric summaries aggregate the full period, not only the visible page. Text and tables in this release use Latin font coverage; a Unicode embedded font should be added for other scripts.

## Deployment and migrations

Production: Vercel project `earn`, team `shakils-projects-439f6ed3`, Node.js 24. Neon is the supplied existing database. Preserve Vercel deployment protection; application authentication adds a separate boundary.

Secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_SETUP_KEY`; nonsecret schema selector: `DATABASE_SCHEMA=earn`. Preview/development must use an isolated database branch or schema. Never give a public preview an initialized production admin session.

The schema is defined with Prisma and versioned SQL migrations. Prisma 7 is pinned because Better Auth's Prisma adapter does not yet support Prisma 8's release-candidate API. `postinstall` and `build` generate the Prisma client.

The cloud execution environment routes outbound access through HTTPS; the migration runner applies the checked-in Prisma-generated SQL using Neon's HTTPS transport. It uses a dedicated `_earn_migrations` checksum ledger, transaction, and advisory lock. It does not impersonate Prisma's `_prisma_migrations` history. Run `npm run db:migrate` for this project; do not mix it with `prisma migrate deploy` against the same schema without a deliberate baseline conversion. The runner's semicolon splitting supports the migrations currently checked in; procedural SQL requires a parser upgrade.

Migration changes should first run in an isolated Neon branch or disposable schema. Apply backward-compatible migrations before deploying code that requires them. A build does not run migrations. Keep test fixtures out of production, inspect schema changes, and retain migration checksum history.

Vercel's Git integration previously lacked repository access; direct source uploads are used until its GitHub app is granted access. The GitHub `main` branch remains the source of truth. The deployment should reference the tested commit and exclude `.env*` secret files and `.admin-setup.txt`.

## Operational characteristics and growth

- The database is the source of truth. No financial state is stored only in browser local storage; local storage is used for theme preferences.
- Five connections per runtime instance bound each pool. Date/payment-date indexes support reports; the partial unique salary index prevents duplicate live employee/day entries. Financial aggregates stay in PostgreSQL. Scale depends on the Neon plan and workload; no load-test throughput claim is made.
- Direct Vercel uploads, health checks and application logs support deployment verification. Logs deliberately omit raw SQL errors and credentials. Add structured request IDs, an error-monitoring service, alert thresholds, and audit browsing/retention policies as usage grows.
- Enable and test Neon point-in-time restore/branch recovery according to the project's plan. Backup retention is not configured by this application. Rehearse restore into a separate branch before relying on it, and verify financial totals and access controls after recovery.
- Admins and database operators are trusted. Application audit logs are append-only through the app but are not tamper-proof against a database owner. Use external immutable audit storage for stricter requirements.
- Next extensions: partial payment ledger, approval workflow, monthly close/snapshots, bulk imports, worker-level permissions, multi-business tenancy, jobs for very large PDFs, email verification/recovery, MFA, and system monitoring. Tenant scoping must be introduced on every model/query before offering multiple businesses in one database.
