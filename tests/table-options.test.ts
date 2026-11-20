import test from "node:test";
import assert from "node:assert/strict";
import { tableOptions, tableOrder } from "../src/lib/table-options";
test("pagination and sorting accept only supported values", () => {
  assert.deepEqual(
    tableOptions(
      new URLSearchParams("page=2&pageSize=50&sort=amount&direction=asc"),
      "expense",
    ),
    { page: 2, pageSize: 50, sort: "amount", direction: "asc" },
  );
  for (const value of [
    "page=1.5",
    "pageSize=10000",
    "page=-1",
    "sort=amount;DROP TABLE",
    "direction=random",
  ])
    assert.throws(() => tableOptions(new URLSearchParams(value), "expense"));
});
test("sort mappings use native decimal and salary relation fields with stable IDs", () => {
  assert.deepEqual(tableOrder("salary", "label", "asc"), [
    { employee: { name: "asc" } },
    { id: "asc" },
  ]);
  assert.deepEqual(tableOrder("employee", "amount", "desc"), [
    { dailyRate: "desc" },
    { id: "asc" },
  ]);
});
