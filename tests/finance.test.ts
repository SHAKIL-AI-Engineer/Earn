import test from "node:test";
import assert from "node:assert/strict";
import { formatMoney, statement } from "../src/lib/finance";
import { canWrite, canExport } from "../src/lib/permissions";
import {
  productionInput,
  salaryInput,
  cashInput,
  dateText,
} from "../src/lib/validation";
test("summary subtracts direct salary and expense totals using decimal arithmetic", () => {
  assert.deepEqual(statement("100.10", "30.30", "10.20"), {
    totalEarn: "100.10",
    netSalary: "30.30",
    netAmount: "10.20",
    totalCost: "40.50",
    netBalance: "59.60",
  });
  assert.equal(statement("0.1", "0.2", "0").netBalance, "-0.10");
});
test("only the requested simple production and salary fields are accepted", () => {
  assert.ok(
    productionInput.safeParse({
      date: "2026-11-20",
      dailyProduction: "12.5",
      totalEarn: "99.99",
    }).success,
  );
  assert.ok(
    salaryInput.safeParse({ date: "2026-11-20", netSalary: "0" }).success,
  );
  assert.equal(
    salaryInput.safeParse({
      date: "2026-11-20",
      netSalary: "50",
      employeeId: "legacy",
    }).success,
    false,
  );
});
test("cash flow is a nonnegative expense with valid dates and bounded decimal places", () => {
  assert.ok(
    cashInput.safeParse({ date: "2026-11-20", netAmount: "12.50" }).success,
  );
  for (const netAmount of ["-1", "1.001", "NaN", "1e3"])
    assert.equal(
      cashInput.safeParse({ date: "2026-11-20", netAmount }).success,
      false,
    );
  assert.equal(dateText.safeParse("2026-02-30").success, false);
  assert.ok(dateText.safeParse("2028-02-29").success);
});
test("role boundaries still protect the three record types and PDF export", () => {
  for (const kind of ["production", "salary", "cashflow"])
    assert.equal(canWrite("viewer", kind), false);
  assert.equal(canWrite("accountant", "production"), false);
  assert.equal(canWrite("manager", "cashflow"), false);
  assert.ok(canWrite("admin", "salary"));
  assert.equal(canExport("viewer"), false);
});
test("taka formatting preserves zero, cents, grouping and negative balances", () => {
  assert.equal(formatMoney("1234567.89"), "৳\u00a01,234,567.89");
  assert.equal(formatMoney("-1.25"), "-৳\u00a01.25");
  assert.equal(formatMoney(0), "৳\u00a00.00");
});
