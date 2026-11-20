# Verification — 20 November 2026

The simplified daily-record application passes lint, TypeScript, the production build and all seven financial, validation, permission and table unit tests. Browser/API checks run against `next start` and an isolated `earn_test_` PostgreSQL schema; test users and financial fixtures never enter the production workspace.

Verified behavior:

- Salary accepts only Date and Net Salary; cash flow accepts only Date and Net Amount; production accepts only Date, Daily Production and Total Earn. Amounts are direct totals, with no employee, rate, category or payment-status fields.
- Cash flow is expense-only and rejects negative amounts. Dates and decimal precision are validated. Each section allows one active total per date; duplicates return 409.
- Decimal daily/monthly summaries calculate Net Balance = Total Earn − Net Salary − Cash Flow Expenses. Stale edits return 409; voiding keeps the original row and an audit event.
- Better Auth email/password login, disabled public registration, role-based writes and PDF export permissions are enforced. Anonymous private API requests and cross-origin writes are rejected.
- Real browser forms have exactly two inputs for salary/cash flow and three for production. Dark/light screens, mobile cards, date filtering, amount sorting and server pagination work without browser runtime errors or horizontal page overflow.
- The PDF export preview renders to canvas. Extracted PDF text contains the simple field labels, matching totals and the taka glyph, without dollar signs. Section headings stay with their first table row.
- A separate migration fixture verifies daily consolidation: two salaries become one total of 50; production becomes quantity 15 and earnings 35; expense 8 plus outgoing cash 7 becomes cash-flow expense 15. Incoming contributions are excluded. Original rows remain archived.
- Production migration uses the existing `earn` schema and checksum ledger. Legacy columns and retired tables remain for recovery; only three business models are exposed in Prisma. Existing authentication tables are retained.
- Architecture canonical JSON and Mermaid static validation pass. The SVG is a structural preview, not native Mermaid renderer evidence.

These are functional checks, not load testing, a backup restoration exercise or an independent financial audit. Deployment continues to use the existing Vercel production project and secrets.
