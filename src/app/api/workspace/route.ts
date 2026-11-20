import { db } from "@/lib/db";
import { actor, failure, HttpError, json } from "@/lib/http";
import { kinds, type Kind } from "@/lib/permissions";
import { periodFrom, report } from "@/lib/reports";
import { cashbook } from "@/lib/cashbook";
import { resource } from "@/lib/records";
export async function GET(request: Request) {
  try {
    const user = await actor();
    const q = new URL(request.url).searchParams;
    const period = periodFrom(q);
    const kind = (q.get("kind") || "production") as Kind;
    if (!kinds.includes(kind)) throw new HttpError(400, "Unknown record type.");
    const page = Math.max(1, Math.min(100000, Number(q.get("page")) || 1));
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
        report(period),
        model.findMany({
          where,
          orderBy:
            kind === "employee"
              ? { name: "asc" }
              : [{ date: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * 20,
          take: 20,
          ...(kind === "salary"
            ? { include: { employee: { select: { name: true, code: true } } } }
            : {}),
        }),
        model.count({ where }),
        db().employee.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          take: 500,
        }),
        user.role === "admin"
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
          : Promise.resolve([]),
      ]);
    const cashRows =
      kind === "cashEntry"
        ? await cashbook(period.start, period.end, search, page)
        : null;
    const rows = cashRows
      ? cashRows.map(({ total, ...row }) => {
          void total;
          return row;
        })
      : normalRows;
    const count = cashRows ? Number(cashRows[0]?.total || 0) : normalCount;
    return json({ ...summary, user, rows, count, page, employees, audit });
  } catch (e) {
    return failure(e);
  }
}
