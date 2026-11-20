import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !process.env.DATABASE_SCHEMA?.startsWith("earn_test_")
)
  throw new Error(
    "E2E writes require localhost and a disposable earn_test_ schema.",
  );
const out =
  process.env.TEST_ARTIFACT_DIR || "/workspace/scratch/earn-admin-verification";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const email = `admin-${randomUUID()}@example.test`,
  password = randomBytes(24).toString("base64url");
async function request(
  path,
  data,
  method = "POST",
  ctx = context,
  expected = 200,
) {
  const r = await ctx.request.fetch(base + path, {
    method,
    headers: { Origin: base, "Content-Type": "application/json" },
    ...(data ? { data } : {}),
  });
  const result = await r.json();
  assert.equal(
    r.status(),
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  return result;
}
const day = "2026-11-20";
try {
  const state = await request("/api/setup", null, "GET");
  assert.equal(state.available, true, "Start with a fresh test schema");
  await request("/api/workspace", null, "GET", context, 401);
  await request(
    "/api/setup",
    {
      key: "invalid",
      name: "Test Admin",
      email,
      password,
      workspace: "Ekushe Studio",
      openingDate: "2026-01-01",
    },
    "POST",
    context,
    403,
  );
  await request(
    "/api/setup",
    {
      key: process.env.ADMIN_SETUP_KEY,
      name: "Test Admin",
      email,
      password,
      workspace: "Ekushe Studio",
      openingDate: "2026-01-01",
    },
    "POST",
    context,
    201,
  );
  await request(
    "/api/setup",
    {
      key: process.env.ADMIN_SETUP_KEY,
      name: "Intruder",
      email: "intruder@example.test",
      password,
      workspace: "Other",
      openingDate: "2026-01-01",
    },
    "POST",
    context,
    409,
  );
  await page.goto(base + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 60000 });
  await page.getByRole("heading", { name: "Business overview" }).waitFor();
  await request(
    "/api/auth/sign-up/email",
    { email: "public@example.test", password, name: "Public" },
    "POST",
    context,
    400,
  );
  let data = await request("/api/workspace?month=2026-11", null, "GET");
  await request(
    "/api/team",
    {
      id: data.user.id,
      name: data.user.name,
      role: "viewer",
      active: true,
      updatedAt: (await request("/api/team", null, "GET"))[0].updatedAt,
    },
    "PATCH",
    context,
    409,
  );
  const employee = await request(
    "/api/records/employee",
    {
      id: randomUUID(),
      name: "Amina Rahman",
      code: "EMP-001",
      position: "Production operator",
      dailyRate: "20.00",
      active: true,
    },
    "POST",
    context,
    201,
  );
  const create = (kind, payload) =>
    request(
      "/api/records/" + kind,
      { id: randomUUID(), date: day, notes: "Integration fixture", ...payload },
      "POST",
      context,
      201,
    );
  const production = await create("production", {
    description: "Cotton shirt batch",
    quantity: "10",
    unitRate: "10",
    unit: "pieces",
    paidOn: "2026-11-21",
  });
  await create("production", {
    description: "Sample production",
    quantity: "5",
    unitRate: "2",
    unit: "pieces",
    paidOn: null,
  });
  await create("salary", {
    employeeId: employee.id,
    daysWorked: "1",
    dailyRate: "20",
    paidOn: day,
  });
  await request(
    "/api/records/salary",
    {
      date: day,
      employeeId: employee.id,
      daysWorked: "0.5",
      dailyRate: "20",
      paidOn: null,
    },
    "POST",
    context,
    409,
  );
  const expense = await create("expense", {
    description: "Fabric materials",
    category: "Materials",
    amount: "15",
    paidOn: day,
  });
  await create("expense", {
    date: "2026-11-19",
    description: "Transport from previous day",
    category: "Transport",
    amount: "7",
    paidOn: day,
  });
  await create("cashEntry", {
    description: "Owner contribution",
    direction: "IN",
    amount: "100",
  });
  data = await request(
    "/api/workspace?period=daily&day=2026-11-20",
    null,
    "GET",
  );
  assert.equal(data.totals.revenue, "110.00");
  assert.equal(data.totals.expenses, "15.00");
  assert.equal(data.totals.salaries, "20.00");
  assert.equal(data.totals.net, "75.00");
  assert.equal(data.totals.cashIn, "100.00");
  assert.equal(data.totals.cashOut, "42.00");
  assert.equal(data.totals.closingCash, "58.00");
  data = await request(
    "/api/workspace?period=monthly&month=2026-11",
    null,
    "GET",
  );
  assert.equal(data.totals.net, "68.00");
  assert.equal(data.totals.closingCash, "158.00");
  data = await request(
    "/api/workspace?period=daily&day=2026-11-21",
    null,
    "GET",
  );
  assert.equal(data.totals.openingCash, "58.00");
  assert.equal(data.totals.closingCash, "158.00");
  const cash = await request(
    "/api/workspace?kind=cashEntry&month=2026-11",
    null,
    "GET",
  );
  assert.equal(cash.count, 5);
  await request(
    "/api/records/production",
    {
      ...production,
      updatedAt: "2020-01-01T00:00:00.000Z",
      date: day,
      paidOn: "2026-11-21",
    },
    "PATCH",
    context,
    409,
  );
  const noOrigin = await context.request.post(base + "/api/records/expense", {
    data: { date: day },
  });
  assert.equal(noOrigin.status(), 403);
  for (const role of ["viewer", "manager", "accountant"]) {
    const u = await request(
      "/api/team",
      { name: `Test ${role}`, email: `${role}@example.test`, password, role },
      "POST",
      context,
      201,
    );
    const c = await browser.newContext();
    await request(
      "/api/auth/sign-in/email",
      { email: u.email, password },
      "POST",
      c,
    );
    await request("/api/workspace", null, "GET", c);
    await request("/api/team", null, "GET", c, 403);
    const denied = role === "manager" ? "expense" : "production";
    await request(
      "/api/records/" + denied,
      { id: randomUUID(), date: day },
      "POST",
      c,
      403,
    );
    if (role === "viewer") {
      const r = await c.request.get(base + "/api/export?month=2026-11");
      assert.equal(r.status(), 403);
    }
    await c.close();
  }
  const users = await request("/api/team", null, "GET");
  const viewer = users.find((u) => u.role === "viewer");
  const viewerContext = await browser.newContext();
  await request(
    "/api/auth/sign-in/email",
    { email: viewer.email, password },
    "POST",
    viewerContext,
  );
  await request(
    "/api/team",
    {
      id: viewer.id,
      name: viewer.name,
      role: "viewer",
      active: false,
      updatedAt: viewer.updatedAt,
    },
    "PATCH",
  );
  const disabled = await viewerContext.request.get(base + "/api/workspace");
  assert.ok([401, 403].includes(disabled.status()));
  await viewerContext.close();
  const pdf = await context.request.get(
    base +
      "/api/export?period=monthly&month=2026-11&sections=production,expense,salary,cash",
  );
  assert.equal(pdf.status(), 200);
  assert.match(pdf.headers()["content-type"], /application\/pdf/);
  const bytes = await pdf.body();
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  writeFileSync(out + "/monthly-summary.pdf", bytes);
  // Test real form interaction rather than only the API.
  await page.goto(base + "/expenses");
  await page
    .getByRole("button", { name: "Add expense", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Office stationery");
  await page.getByLabel("Amount (৳)", { exact: true }).fill("2.50");
  await page.getByLabel("Entry date").fill(day);
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved." })
    .waitFor({ timeout: 30000 });
  await page.goto(base + "/dashboard");
  await page.getByRole("heading", { name: "Business overview" }).waitFor();
  await page.getByText("Cotton shirt batch").waitFor({ timeout: 30000 });
  await page.screenshot({ path: out + "/dashboard-dark.png", fullPage: true });
  await page
    .getByRole("button", { name: "Toggle light and dark theme" })
    .click();
  await page.screenshot({ path: out + "/dashboard-light.png", fullPage: true });
  await page
    .getByRole("button", { name: "Toggle light and dark theme" })
    .click();
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate preview", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Download PDF", exact: true })
    .waitFor({ timeout: 60000 });
  await page.locator('canvas[data-ready="true"]').waitFor({ timeout: 60000 });
  await page.screenshot({ path: out + "/pdf-export.png", fullPage: true });
  await page.getByRole("button", { name: "Close PDF export" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Cash flow", exact: true })
    .click();
  await page.waitForURL("**/cashflow");
  await page.getByText("Owner contribution").waitFor({ timeout: 30000 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Mobile layout must not overflow",
  );
  await page.screenshot({ path: out + "/mobile.png", fullPage: true });
  // Voids remove amounts from both reports and payment-date cash flow, retaining audit.
  await request(
    "/api/records/expense",
    { id: expense.id, updatedAt: expense.updatedAt },
    "DELETE",
  );
  data = await request(
    "/api/workspace?period=monthly&month=2026-11",
    null,
    "GET",
  );
  assert.equal(data.totals.expenses, "9.50");
  assert.equal(data.totals.closingCash, "173.00");
  assert.ok(data.audit.some((a) => a.action === "VOID"));
  // Sort and paginate the entire matching dataset, not just the visible rows.
  for (let offset = 0; offset < 24; offset += 4)
    await Promise.all(
      Array.from({ length: Math.min(4, 24 - offset) }, (_, i) =>
        create("expense", {
          description: `Table sample ${String(offset + i + 1).padStart(2, "0")}`,
          category: "Office",
          amount: String(offset + i + 1),
          paidOn: null,
        }),
      ),
    );
  const sorted = await request(
    "/api/workspace?kind=expense&month=2026-11&search=Table%20sample&pageSize=10&sort=amount&direction=desc&summary=0",
    null,
    "GET",
  );
  assert.equal(sorted.count, 24);
  assert.equal(sorted.rows.length, 10);
  assert.equal(sorted.rows[0].amount, "24");
  assert.equal(sorted.totals, undefined);
  const second = await request(
    "/api/workspace?kind=expense&month=2026-11&search=Table%20sample&pageSize=10&page=2&sort=amount&direction=desc&summary=0",
    null,
    "GET",
  );
  assert.equal(second.rows[0].amount, "14");
  const clamped = await request(
    "/api/workspace?kind=expense&month=2026-11&search=Table%20sample&pageSize=10&page=99&sort=amount&direction=desc&summary=0",
    null,
    "GET",
  );
  assert.equal(clamped.page, 3);
  assert.equal(clamped.rows.length, 4);
  await request("/api/workspace?pageSize=7", null, "GET", context, 400);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(base + "/expenses");
  await page.getByLabel("Search records").fill("Table sample");
  await page
    .getByText(/^Table sample \d+$/)
    .first()
    .waitFor();
  const sizeRequest = page.waitForResponse(
    (r) =>
      r.url().includes("/api/workspace?") &&
      new URL(r.url()).searchParams.get("pageSize") === "10",
  );
  await page.getByLabel("Rows per page").selectOption("10");
  await sizeRequest;
  const orderRequest = page.waitForResponse(
    (r) =>
      r.url().includes("/api/workspace?") &&
      new URL(r.url()).searchParams.get("sort") === "amount",
  );
  await page.getByRole("button", { name: "Amount", exact: true }).click();
  await orderRequest;
  await page
    .getByRole("columnheader", { name: "Amount", exact: true })
    .evaluate((el) => el.getAttribute("aria-sort"))
    .then((value) => assert.equal(value, "ascending"));
  await page.getByRole("button", { name: "Use compact rows" }).click();
  await page.screenshot({ path: out + "/table-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Sort records").selectOption("amount:desc");
  await page.getByText("Table sample 24", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: out + "/table-mobile.png", fullPage: true });
  const bodyText = await page.locator("body").innerText();
  assert.ok(bodyText.includes("৳"));
  assert.equal(bodyText.includes("$"), false);
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(
    "PASS: setup, login, role boundaries, CSRF, decimal reports, payment-date cash flow, duplicate/stale protection, account revocation, PDF, UI form, themes, mobile, void audit.",
  );
  console.log("Artifacts:", out);
} finally {
  await browser.close();
}
