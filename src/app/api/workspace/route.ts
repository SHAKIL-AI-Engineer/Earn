import { db } from "@/lib/db";
import { actor, failure, HttpError, json } from "@/lib/http";
import { kinds, type Kind } from "@/lib/permissions";
import { periodFrom, report } from "@/lib/reports";
import { tableOptions, tableOrder } from "@/lib/table-options";
import { resource } from "@/lib/records";
import { date, dateText } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const user = await actor(),
      q = new URL(request.url).searchParams,
      period = periodFrom(q);
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
    const { page, pageSize, sort, direction } = options,
      includeSummary = q.get("summary") !== "0";
    const selected = q.get("date"),
      where = {
        voidedAt: null,
        date: { gte: period.start, lt: period.end },
        ...(selected
          ? { AND: [{ date: date(dateText.parse(selected)) }] }
          : {}),
      };
    const model = resource(db(), kind);
    const [summary, count, audit] = await Promise.all([
      includeSummary ? report(period) : Promise.resolve({}),
      model.count({ where }),
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
    const effectivePage = Math.min(
      page,
      Math.max(1, Math.ceil(count / pageSize)),
    );
    const rows = await model.findMany({
      where,
      orderBy: tableOrder(kind, sort, direction),
      skip: (effectivePage - 1) * pageSize,
      take: pageSize,
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
      ...(includeSummary ? { audit: audit || [] } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
