import test from "node:test";
import assert from "node:assert/strict";
import { cashBalance, productAmount, statement } from "../src/lib/finance";
import { canExport, canWrite } from "../src/lib/permissions";
import { dateText, salaryInput } from "../src/lib/validation";
test("financial multiplication rounds each record using decimal half-up", () => {
  assert.equal(productAmount("10.005", "2.50").toFixed(2), "25.01");
  assert.equal(productAmount("0.5", "44.01").toFixed(2), "22.01");
});
test("earnings deduct salaries separately from operating expenses", () => {
  assert.deepEqual(statement("100.10", "10.20", "30.30"), {
    revenue: "100.10",
    expenses: "10.20",
    salaries: "30.30",
    costs: "40.50",
    net: "59.60",
  });
  assert.equal(statement("10", "11", "2").net, "-3.00");
});
test("cash balance supports withdrawals, opening debt and fractional amounts", () => {
  assert.equal(cashBalance("-5.20", "10.10", "2.90"), "2.00");
  assert.equal(cashBalance("0", "0.1", "0.2"), "-0.10");
});
test("permissions do not grant financial write or export to viewers", () => {
  for (const k of ["production", "salary", "expense", "cashEntry", "employee"])
    assert.equal(canWrite("viewer", k), false);
  assert.equal(canExport("viewer"), false);
  assert.equal(canWrite("manager", "expense"), false);
  assert.equal(canWrite("accountant", "production"), false);
  assert.equal(canWrite("admin", "employee"), true);
});
test("salary fractions are bounded to a single working day and dates are real", () => {
  assert.equal(
    salaryInput.safeParse({
      date: "2026-11-20",
      employeeId: "employee",
      daysWorked: "1.01",
      dailyRate: "20",
    }).success,
    false,
  );
  assert.equal(dateText.safeParse("2026-02-30").success, false);
  assert.equal(dateText.safeParse("2028-02-29").success, true);
});
