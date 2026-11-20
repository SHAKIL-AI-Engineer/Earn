import test from "node:test";
import assert from "node:assert/strict";
import { tableOptions, tableOrder } from "../src/lib/table-options";
test("only valid daily table sorting and pagination are accepted", () => {
  assert.deepEqual(
    tableOptions(
      new URLSearchParams("page=2&pageSize=50&sort=amount&direction=asc"),
      "salary",
    ),
    { page: 2, pageSize: 50, sort: "amount", direction: "asc" },
  );
  for (const value of [
    "page=-1",
    "page=1.5",
    "pageSize=10000",
    "sort=label",
    "sort=amount;DROP TABLE",
    "direction=random",
  ])
    assert.throws(() => tableOptions(new URLSearchParams(value), "cashflow"));
});
test("native schema fields are used for numeric sorting", () => {
  assert.deepEqual(tableOrder("salary", "amount", "asc"), [
    { netSalary: "asc" },
    { id: "asc" },
  ]);
  assert.deepEqual(tableOrder("production", "amount", "desc"), [
    { totalEarn: "desc" },
    { id: "asc" },
  ]);
  assert.deepEqual(tableOrder("cashflow", "amount", "asc"), [
    { netAmount: "asc" },
    { id: "asc" },
  ]);
});
