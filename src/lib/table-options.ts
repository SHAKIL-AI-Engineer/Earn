export type SortKey = "date" | "label" | "amount";
export type SortDirection = "asc" | "desc";
export const pageSizes = [10, 20, 50] as const;
export function tableOptions(q: URLSearchParams, kind: string) {
  const page = Number(q.get("page") || 1);
  const pageSize = Number(q.get("pageSize") || 20);
  const sort = q.get("sort") || (kind === "employee" ? "label" : "date");
  const direction =
    q.get("direction") || (kind === "employee" ? "asc" : "desc");
  if (!Number.isInteger(page) || page < 1 || page > 100000)
    throw new Error("Invalid page number.");
  if (!pageSizes.includes(pageSize as 10 | 20 | 50))
    throw new Error("Choose 10, 20, or 50 rows per page.");
  if (
    !["date", "label", "amount"].includes(sort) ||
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
  kind: string,
  sort: SortKey,
  direction: SortDirection,
) {
  const field =
    sort === "amount"
      ? kind === "employee"
        ? "dailyRate"
        : "amount"
      : sort === "label"
        ? kind === "employee"
          ? "name"
          : "description"
        : kind === "employee"
          ? "code"
          : "date";
  return [
    kind === "salary" && sort === "label"
      ? { employee: { name: direction } }
      : { [field]: direction },
    { id: "asc" },
  ];
}
