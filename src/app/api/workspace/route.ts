import { db } from "@/lib/db";
import { actor, failure, HttpError, json } from "@/lib/http";
import { kinds, type Kind } from "@/lib/permissions";
import { periodFrom, report } from "@/lib/reports";
import { cashbook } from "@/lib/cashbook";
import { tableOptions, tableOrder } from "@/lib/table-options";
import { resource } from "@/lib/records";
export async function GET(request: Request) {
  try {
    const user = await actor();
    const q = new URL(request.url).searchParams;
    const period = periodFrom(q);
    const kind = (q.get("kind") || "production") as Kind;
    if (!kinds.includes(kind)) throw new HttpError(400, "Unknown record type.");
    let options;
    try {
      options = tableOptions(q, kind);
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Invalid table options.",
      );
    }
    const { page, pageSize, sort, direction } = options;
    const includeSummary = q.get("summary") !== "0";
    const search = (q.get("search") || "").slice(0, 100);
    const status = q.get("status");
    const where =
      kind === "employee"
        ? {
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
          }
        : {
            voidedAt: null,
            date: { gte: period.start, lt: period.end },
            ...(search
              ? kind === "salary"
                ? {
                    employee: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  }
                : { description: { contains: search, mode: "insensitive" } }
              : {}),
            ...(["production", "expense", "salary"].includes(kind) &&
            ["paid", "pending"].includes(status || "")
              ? { paidOn: status === "paid" ? { not: null } : null }
              : {}),
            ...(kind === "expense" && q.get("category")
              ? { category: q.get("category") }
              : {}),
          };
    const model = resource(db(), kind);
    const [summary, normalRows, normalCount, employees, audit] =
      await Promise.all([
        includeSummary ? report(period) : Promise.resolve({}),
        kind === "cashEntry"
          ? Promise.resolve([])
          : model.findMany({
              where,
              orderBy: tableOrder(kind, sort, direction),
              skip: (page - 1) * pageSize,
              take: pageSize,
              ...(kind === "salary"
                ? {
                    include: {
                      employee: { select: { name: true, code: true } },
                    },
                  }
                : {}),
            }),
        kind === "cashEntry" ? Promise.resolve(0) : model.count({ where }),
        includeSummary
          ? db().employee.findMany({
              where: { active: true },
              orderBy: { name: "asc" },
              take: 500,
            })
          : Promise.resolve(undefined),
        includeSummary && user.role === "admin"
          ? db().auditLog.findMany({
              orderBy: { createdAt: "desc" },
              take: 15,
              select: {
                id: true,
                actorName: true,
                action: true,
                entity: true,
                createdAt: true,
              },
            })
          : Promise.resolve(undefined),
      ]);
    let cashRows =
      kind === "cashEntry"
        ? await cashbook(
            period.start,
            period.end,
            search,
            page,
            pageSize,
            db(),
            { sort, direction },
          )
        : null;
    let count = cashRows ? Number(cashRows[0]?.total || 0) : normalCount;
    if (cashRows && !cashRows.length && page > 1) {
      const first = await cashbook(
        period.start,
        period.end,
        search,
        1,
        pageSize,
        db(),
        { sort, direction },
      );
      count = Number(first[0]?.total || 0);
    }
    const effectivePage = Math.min(
      page,
      Math.max(1, Math.ceil(count / pageSize)),
    );
    let rows = normalRows;
    if (kind === "cashEntry") {
      if (effectivePage !== page)
        cashRows = await cashbook(
          period.start,
          period.end,
          search,
          effectivePage,
          pageSize,
          db(),
          { sort, direction },
        );
      rows = (cashRows || []).map(({ total, ...row }) => {
        void total;
        return row;
      });
    } else if (effectivePage !== page)
      rows = await model.findMany({
        where,
        orderBy: tableOrder(kind, sort, direction),
        skip: (effectivePage - 1) * pageSize,
        take: pageSize,
        ...(kind === "salary"
          ? { include: { employee: { select: { name: true, code: true } } } }
          : {}),
      });
    return json({
      ...summary,
      user,
      rows,
      count,
      page: effectivePage,
      pageSize,
      sort,
      direction,
      ...(includeSummary ? { employees, audit: audit || [] } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
