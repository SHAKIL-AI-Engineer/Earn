import type { Kind } from "./permissions";
export type SortKey = "date" | "amount" | "dailyProduction";
export type SortDirection = "asc" | "desc";
export const pageSizes = [10, 20, 50] as const;
export function tableOptions(q: URLSearchParams, kind: string) {
  const page = Number(q.get("page") || 1),
    pageSize = Number(q.get("pageSize") || 20);
  const sort = q.get("sort") || "date",
    direction = q.get("direction") || "desc";
  if (!Number.isInteger(page) || page < 1 || page > 100000)
    throw new Error("Invalid page number.");
  if (!pageSizes.includes(pageSize as 10 | 20 | 50))
    throw new Error("Choose 10, 20, or 50 rows per page.");
  if (
    ![
      "date",
      "amount",
      ...(kind === "production" ? ["dailyProduction"] : []),
    ].includes(sort) ||
    !["asc", "desc"].includes(direction)
  )
    throw new Error("Invalid table sorting.");
  return {
    page,
    pageSize,
    sort: sort as SortKey,
    direction: direction as SortDirection,
  };
}
export function tableOrder(
  kind: Kind,
  sort: SortKey,
  direction: SortDirection,
) {
  const field =
    sort === "amount"
      ? kind === "production"
        ? "totalEarn"
        : kind === "salary"
          ? "netSalary"
          : "netAmount"
      : sort;
  return [{ [field]: direction }, { id: "asc" }];
}
