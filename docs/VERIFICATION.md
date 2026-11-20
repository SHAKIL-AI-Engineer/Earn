# Verification — 20 November 2026

The updated dashboard passed lint, TypeScript, the production build, and all eight financial/permission/table unit tests. End-to-end checks ran against `next start` with a disposable `earn_test_` PostgreSQL schema. No fixtures or default users were added to the production `earn` workspace.

Verified flows:

- Private APIs reject anonymous requests; public registration is disabled.
- Setup rejects an invalid private key, creates the first administrator atomically, and closes after initialization.
- Better Auth login works; the last active admin cannot be removed. Admin, Manager, Accountant and Viewer API boundaries are enforced.
- A disabled member's sessions are revoked; cross-origin/missing-origin writes are rejected.
- Production, employee, daily salary, operating expense and owner-cash records persist through Prisma.
- Duplicate employee/day salary entries and stale financial edits return 409.
- Daily/monthly net earnings use correct decimal totals. Cash payments from an earlier earning/expense date enter the correct payment-date cash book; opening/closing cash reconcile across adjacent days.
- A real browser form saves an expense. Dark and light dashboards render; mobile navigation works without horizontal page overflow.
- Detailed PDFs contain the expected monthly totals and are valid A4 files. The PDF viewer renders the generated file to a canvas before enabling preview verification; download uses the same blob.
- Voiding an expense updates financial and cash totals while retaining an audit event.
- No browser runtime errors occurred. Source and built browser bundles passed a scan for the database password, authentication secret, and initial-setup secret.
- Architecture canonical JSON passed JSON Schema validation and the skill's static Mermaid lint. The supplied SVG is a structural preview, not a native renderer assertion.

Limits: these checks are functional, not a penetration test, load test, backup restore rehearsal, or independent financial audit. The owner explicitly authorized storing the newly generated application secrets in the existing Vercel project earn and deploying the tested update. The requested production administrator has since been provisioned and sign-in verified.

## Currency and table update

- BDT formatter tests cover zero, cents, grouping, and negative values; existing arithmetic tests still pass.
- Taka currency glyphs are present in extracted PDF text, with no dollar signs. The font is included in the export function trace.
- Server-side sorting is verified against 24 matching records across 10-row pages, including page bounds and invalid-page-size rejection. Table-only responses omit report aggregates.
- Desktop column sorting, page-size and density controls, mobile sorting/cards, light/dark UI and PDF preview pass browser checks without runtime errors or horizontal page overflow.
- Fixtures remain isolated in a disposable test schema. Monetary totals and account counts are compared before/after the production currency metadata migration.
