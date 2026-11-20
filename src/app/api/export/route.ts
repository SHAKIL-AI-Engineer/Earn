import { renderToBuffer } from "@react-pdf/renderer";
import { actor, failure, HttpError } from "@/lib/http";
import { canExport } from "@/lib/permissions";
import { periodFrom, report } from "@/lib/reports";
import { db } from "@/lib/db";
import { cashbook } from "@/lib/cashbook";
import { ReportPdf, type PdfSection } from "@/components/report-pdf";
export async function GET(request: Request) {
  try {
    const user = await actor();
    if (!canExport(user.role))
      throw new HttpError(403, "Your role cannot export reports.");
    const q = new URL(request.url).searchParams;
    const period = periodFrom(q);
    const { data, sections } = await db().$transaction(
      async (tx) => {
        const data = await report(period, tx);
        const sections: PdfSection[] = [];
        const where = {
          date: { gte: period.start, lt: period.end },
          voidedAt: null,
        };
        const enabled = new Set(
          (q.get("sections") ?? "production,expense,salary,cash").split(","),
        );
        const dt = (d: Date) => d.toISOString().slice(0, 10);
        if (q.get("detail") !== "summary") {
          if (enabled.has("production")) {
            const rows = await tx.production.findMany({
              where,
              orderBy: { date: "asc" },
              take: 2001,
            });
            if (rows.length > 2000)
              throw new HttpError(
                422,
                "Choose a daily report; this section exceeds 2,000 records.",
              );
            sections.push({
              title: "Daily production",
              rows: rows.map((r) => ({
                date: dt(r.date),
                label: r.description,
                detail: `${r.quantity} ${r.unit} × $${r.unitRate}`,
                amount: r.amount.toFixed(2),
                status: r.paidOn ? `Paid ${dt(r.paidOn)}` : "Pending",
              })),
            });
          }
          if (enabled.has("expense")) {
            const rows = await tx.expense.findMany({
              where,
              orderBy: { date: "asc" },
              take: 2001,
            });
            if (rows.length > 2000)
              throw new HttpError(
                422,
                "Choose a daily report; this section exceeds 2,000 records.",
              );
            sections.push({
              title: "Operating expenses",
              rows: rows.map((r) => ({
                date: dt(r.date),
                label: r.description,
                detail: r.category,
                amount: r.amount.toFixed(2),
                status: r.paidOn ? `Paid ${dt(r.paidOn)}` : "Pending",
              })),
            });
          }
          if (enabled.has("salary")) {
            const rows = await tx.salary.findMany({
              where,
              include: { employee: true },
              orderBy: { date: "asc" },
              take: 2001,
            });
            if (rows.length > 2000)
              throw new HttpError(
                422,
                "Choose a daily report; this section exceeds 2,000 records.",
              );
            sections.push({
              title: "Daily salaries",
              rows: rows.map((r) => ({
                date: dt(r.date),
                label: r.employee.name,
                detail: `${r.daysWorked} day × $${r.dailyRate}`,
                amount: r.amount.toFixed(2),
                status: r.paidOn ? `Paid ${dt(r.paidOn)}` : "Pending",
              })),
            });
          }
          if (enabled.has("cash")) {
            const rows = await cashbook(
              period.start,
              period.end,
              "",
              1,
              2001,
              tx,
            );
            if (rows.length > 2000)
              throw new HttpError(
                422,
                "Choose a daily report; cash activity exceeds 2,000 records.",
              );
            sections.push({
              title: "Cash activity by payment date",
              rows: rows.map((r) => ({
                date: dt(r.date),
                label: r.description,
                detail: r.source,
                amount: r.amount.toFixed(2),
                status: r.direction === "IN" ? "Cash in" : "Cash out",
              })),
            });
          }
        }
        return { data, sections };
      },
      { isolationLevel: "RepeatableRead", timeout: 30000 },
    );
    const buffer = await renderToBuffer(
      ReportPdf({
        data,
        sections,
        orientation:
          q.get("orientation") === "landscape" ? "landscape" : "portrait",
      }),
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="earn-${period.mode}-${period.mode === "daily" ? period.day : period.month}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
