# Earn — simple system design

Earn records daily production, salary, and cash flow expenses. It is one Next.js application deployed on Vercel, with Prisma ORM and the existing Neon PostgreSQL database. Better Auth provides email/password login. No queues, microservices, employee payroll engine, or payment ledger are required.

[Editable diagram](architecture-diagrams.md) · [Diagram source](architecture-diagrams.json) · [Structural preview](architecture-preview.svg)

## Three business models

| Model      | Business fields                        | Meaning                                             |
| ---------- | -------------------------------------- | --------------------------------------------------- |
| Salary     | `date`, `netSalary`                    | The final salary total for the day                  |
| Cashflow   | `date`, `netAmount`                    | The daily expense total: money paid out             |
| Production | `date`, `dailyProduction`, `totalEarn` | Daily quantity and final earnings, entered directly |

Each model also has an ID, creator ID, timestamps and a void timestamp for safe editing/history. SQL partial unique indexes enforce one active total per date in each section. The UI and API reject duplicates and ask the user to edit the existing daily total.

The login/session/credential/rate-limit tables, workspace settings and audit log are supporting system records. They are not extra business entry screens. Employee and category-based expense management are removed from the active application. Old `/expenses` and `/employees` bookmarks redirect to the simpler cash-flow and salary screens.

## Data flow

Browser → Next.js API → current-user permission check → field validation → Prisma transaction → Neon.

The same server reporting function supplies dashboard and PDF totals. PDF summaries and detail rows share a repeatable-read snapshot. PDFs render on the server and preview in the browser with page/zoom controls. The local OFL-licensed Noto Sans Bengali font supplies the ৳ glyph.

## Calculation rules

- Enter `totalEarn`, `netSalary`, and `netAmount` directly; no rates or employee calculations are required.
- Amounts are nonnegative BDT decimals with two fractional digits. Daily production allows up to three fractional digits. Zero totals are allowed.
- **Total Costs = Net Salary + Cash Flow Expenses.**
- **Net Balance = Total Earn − Total Costs.** Negative balances are displayed explicitly.
- Monthly summaries sum the daily records. Calendar dates use Asia/Dhaka; transport/storage uses PostgreSQL `DATE`, not time-of-day values.
- There are no paid/unpaid states, separate payment dates, owner contributions, or opening-cash reconciliation in the simple workflow. Net Balance is an earnings/cost result, not a bank balance.

## Access and integrity

Admin can update all records, users, and settings. Manager can update production and salary. Accountant can update salary and cash flow expenses. Viewer can read records; PDF export is reserved for Admin, Manager and Accountant.

Every private endpoint validates the session and current user role/status in the database. Mutations require a same-origin request and validated fields. Records and audit events commit together; stale versions return 409. Voiding removes a row from totals while retaining its history. The last active administrator cannot be disabled. Public sign-up remains closed; admins provision users with Better Auth password hashing.

## Main endpoints

- `/api/workspace`: period totals and paginated daily records. Date/amount sorting is server-side; production can also sort by daily production. Table-only refreshes omit unchanged summaries.
- `/api/records/production`, `/salary`, `/cashflow`: create, update, or void simple daily records.
- `/api/export`: private daily/monthly PDF with selected sections.
- `/api/team`, `/api/settings`: administrator-only user/role and workspace-name management.
- `/api/auth/*`: Better Auth login/session endpoints.

## Migration and deployment

The supplied database and existing login are retained. `202611200004_simple_daily_records` makes legacy salary/rate fields optional, consolidates active salary/production rows per date, and consolidates expenses plus outgoing adjustments into daily cash flow expenses. Incoming owner contributions are retained as legacy history and are not classified as expenses. Original rows are retained with void markers; old Employee/Expense tables remain for recovery but are absent from the active Prisma business model. The production database contained no business records before this change.

Prisma `@map` preserves existing raw column names while exposing `netSalary`, `netAmount`, `dailyProduction`, and `totalEarn` in the application schema. Do not blindly generate destructive cleanup migrations from differences against the retained legacy columns. Use checked-in SQL, the `_earn_migrations` checksum ledger and the project's migration runner.

Production remains Vercel project `earn`, Node.js 24, with the existing secrets. Test schema changes in an isolated Neon branch/schema before applying them. No production test users or financial fixtures are inserted. Backups/restore retention depend on the Neon plan; rehearse recovery separately. This application is a simple daily-total tracker, not tax software or a full accounting ledger.
