import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !process.env.DATABASE_SCHEMA?.startsWith("earn_test_")
)
  throw new Error(
    "Use localhost and a disposable earn_test_ schema for verification",
  );
const out =
  process.env.TEST_ARTIFACT_DIR ||
  "/workspace/scratch/earn-simple-verification";
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
  }),
  page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const email = `admin-${randomUUID()}@example.test`,
  password = randomBytes(24).toString("base64url"),
  day = "2026-11-20";
async function request(
  path,
  data,
  method = "POST",
  ctx = context,
  expected = 200,
) {
  const response = await ctx.request.fetch(base + path, {
    method,
    headers: { Origin: base, "Content-Type": "application/json" },
    ...(data ? { data } : {}),
  });
  const result = await response.json();
  assert.equal(
    response.status(),
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  return result;
}
const create = (kind, data) =>
  request(
    `/api/records/${kind}`,
    { id: randomUUID(), date: day, ...data },
    "POST",
    context,
    201,
  );
try {
  assert.equal((await request("/api/setup", null, "GET")).available, true);
  await request("/api/workspace", null, "GET", context, 401);
  await request(
    "/api/setup",
    {
      key: process.env.ADMIN_SETUP_KEY,
      name: "Test Admin",
      email,
      password,
      workspace: "Simple Earn",
      openingDate: "2026-01-01",
    },
    "POST",
    context,
    201,
  );
  await page.goto(base + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 60000 });
  await request(
    "/api/auth/sign-up/email",
    { name: "Public", email: "public@example.test", password },
    "POST",
    context,
    400,
  );
  const p = await create("production", {
    dailyProduction: "10",
    totalEarn: "1000",
  });
  await create("production", {
    date: "2026-11-21",
    dailyProduction: "5",
    totalEarn: "500",
  });
  const salary = await create("salary", { netSalary: "200" });
  const secondSalary = await create("salary", {
    date: "2026-11-21",
    netSalary: "100",
  });
  await create("cashflow", { netAmount: "100" });
  await create("cashflow", { date: "2026-11-21", netAmount: "50" });
  await request(
    "/api/records/salary",
    { date: day, netSalary: "300" },
    "POST",
    context,
    409,
  );
  await request(
    "/api/records/production",
    { date: day, dailyProduction: "1", totalEarn: "5" },
    "POST",
    context,
    409,
  );
  await request(
    "/api/records/cashflow",
    { date: "2026-11-22", netAmount: "-5" },
    "POST",
    context,
    400,
  );
  await request(
    "/api/records/salary",
    { date: "2026-11-22", netSalary: "2", employeeId: "legacy" },
    "POST",
    context,
    400,
  );
  let data = await request(
    "/api/workspace?period=daily&day=2026-11-20",
    null,
    "GET",
  );
  assert.equal(data.totals.totalEarn, "1000.00");
  assert.equal(data.totals.netSalary, "200.00");
  assert.equal(data.totals.netAmount, "100.00");
  assert.equal(data.totals.netBalance, "700.00");
  data = await request("/api/workspace?month=2026-11", null, "GET");
  assert.equal(data.totals.totalEarn, "1500.00");
  assert.equal(data.totals.netBalance, "1050.00");
  assert.equal(data.totals.dailyProduction, "15");
  await request(
    "/api/records/salary",
    { id: salary.id, updatedAt: salary.updatedAt, date: day, netSalary: "250" },
    "PATCH",
  );
  await request(
    "/api/records/salary",
    { id: salary.id, updatedAt: salary.updatedAt, date: day, netSalary: "260" },
    "PATCH",
    context,
    409,
  );
  await request(
    "/api/records/salary",
    { id: secondSalary.id, updatedAt: secondSalary.updatedAt },
    "DELETE",
  );
  data = await request("/api/workspace?month=2026-11", null, "GET");
  assert.equal(data.totals.netSalary, "250.00");
  assert.equal(data.totals.netBalance, "1100.00");
  assert.ok(data.audit.some((r) => r.action === "VOID"));
  const noOrigin = await context.request.post(
    base + "/api/records/production",
    { data: { date: day } },
  );
  assert.equal(noOrigin.status(), 403);
  for (const role of ["manager", "accountant", "viewer"]) {
    const user = await request(
      "/api/team",
      { name: `Test ${role}`, email: `${role}@example.test`, password, role },
      "POST",
      context,
      201,
    );
    const ctx = await browser.newContext();
    await request(
      "/api/auth/sign-in/email",
      { email: user.email, password },
      "POST",
      ctx,
    );
    await request("/api/workspace", null, "GET", ctx);
    await request("/api/team", null, "GET", ctx, 403);
    await request(
      `/api/records/${role === "manager" ? "cashflow" : "production"}`,
      { date: day },
      "POST",
      ctx,
      403,
    );
    if (role === "viewer")
      assert.equal(
        (await ctx.request.get(base + "/api/export?month=2026-11")).status(),
        403,
      );
    await ctx.close();
  }
  // The salary form has exactly the two requested inputs, with no employee setup.
  await page.goto(base + "/salaries");
  await page
    .getByRole("button", { name: "Add salary", exact: true })
    .first()
    .click();
  assert.equal(await page.getByRole("dialog").locator("input").count(), 2);
  await page.getByLabel("Date", { exact: true }).fill("2026-11-22");
  await page.getByLabel("Net Salary (৳)", { exact: true }).fill("75");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved." })
    .waitFor({ timeout: 30000 });
  await page.goto(base + "/production");
  await page
    .getByRole("button", { name: "Add production", exact: true })
    .first()
    .click();
  assert.equal(await page.getByRole("dialog").locator("input").count(), 3);
  await page.getByRole("button", { name: "Close form" }).click();
  await page.goto(base + "/cashflow");
  await page
    .getByRole("button", { name: "Add cash flow expense", exact: true })
    .first()
    .click();
  assert.equal(await page.getByRole("dialog").locator("input").count(), 2);
  await page.getByRole("button", { name: "Close form" }).click();
  await page.goto(base + "/dashboard");
  await page.getByRole("heading", { name: "Daily overview" }).waitFor();
  await page
    .getByRole("cell", { name: "20 Nov 2026", exact: true })
    .waitFor({ timeout: 30000 });
  await page.screenshot({ path: out + "/dashboard-dark.png", fullPage: true });
  await page
    .getByRole("button", { name: "Toggle light and dark theme" })
    .click();
  await page.screenshot({ path: out + "/dashboard-light.png", fullPage: true });
  await page
    .getByRole("button", { name: "Toggle light and dark theme" })
    .click();
  await page.getByRole("tab", { name: "Salary", exact: true }).click();
  await page
    .getByRole("columnheader", { name: "Net Salary", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate preview", exact: true })
    .click();
  await page.locator('canvas[data-ready="true"]').waitFor({ timeout: 60000 });
  await page.screenshot({ path: out + "/pdf-export.png", fullPage: true });
  await page.getByRole("button", { name: "Close PDF export" }).click();
  const pdf = await context.request.get(base + "/api/export?month=2026-11");
  assert.equal(pdf.status(), 200);
  const bytes = await pdf.body();
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  writeFileSync(out + "/monthly-summary.pdf", bytes);
  // Full-dataset sorting and pagination across daily entries.
  for (let i = 1; i <= 18; i += 4)
    await Promise.all(
      Array.from({ length: Math.min(4, 19 - i) }, (_, j) =>
        create("cashflow", {
          date: `2026-11-${String(i + j).padStart(2, "0")}`,
          netAmount: String((i + j) * 10),
        }),
      ),
    );
  const sorted = await request(
    "/api/workspace?kind=cashflow&month=2026-11&pageSize=10&sort=amount&direction=desc&summary=0",
    null,
    "GET",
  );
  assert.equal(sorted.count, 20);
  assert.equal(sorted.rows.length, 10);
  assert.equal(sorted.rows[0].netAmount, "180");
  assert.equal(sorted.totals, undefined);
  const filtered = await request(
    "/api/workspace?kind=cashflow&month=2026-11&date=2026-11-20&summary=0",
    null,
    "GET",
  );
  assert.equal(filtered.count, 1);
  assert.equal(filtered.rows[0].netAmount, "100");
  await request("/api/workspace?pageSize=7", null, "GET", context, 400);
  await page.goto(base + "/cashflow");
  await page
    .getByRole("columnheader", { name: "Net Amount", exact: true })
    .waitFor();
  const sizeResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/api/workspace?") &&
      new URL(r.url()).searchParams.get("pageSize") === "10",
  );
  await page.getByLabel("Rows per page").selectOption("10");
  await sizeResponse;
  const sortResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/api/workspace?") &&
      new URL(r.url()).searchParams.get("sort") === "amount",
  );
  await page.getByRole("button", { name: "Net Amount", exact: true }).click();
  await sortResponse;
  await page.screenshot({
    path: out + "/salary-cashflow-table.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Sort records").selectOption("amount:desc");
  await page
    .locator("td.amount")
    .filter({ hasText: "180.00" })
    .first()
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: out + "/mobile.png", fullPage: true });
  const bodyText = await page.locator("body").innerText();
  assert.ok(bodyText.includes("৳"));
  assert.equal(bodyText.includes("$"), false);
  assert.deepEqual(errors, []);
  // Entry changes are direct totals, not quantity × rate calculations.
  assert.equal(p.totalEarn, "1000");
  console.log(
    "PASS: simple two/three-field forms, direct totals, one-per-date rules, expense-only cashflow, monthly reports, roles, stale edits, void audit, PDF, pagination, themes and mobile.",
  );
  console.log("Artifacts:", out);
} finally {
  await browser.close();
}
