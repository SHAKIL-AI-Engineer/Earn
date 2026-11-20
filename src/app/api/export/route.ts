import { renderToBuffer } from "@react-pdf/renderer";
import { actor, failure, HttpError } from "@/lib/http";
import { canExport, kinds, type Kind } from "@/lib/permissions";
import { periodFrom, report } from "@/lib/reports";
import { db } from "@/lib/db";
import { resource } from "@/lib/records";
import { ReportPdf, type PdfSection } from "@/components/report-pdf";
export async function GET(request: Request) {
  try {
    const user = await actor();
    if (!canExport(user.role))
      throw new HttpError(403, "Your role cannot export reports.");
    const q = new URL(request.url).searchParams,
      period = periodFrom(q);
    const selected = (q.get("sections") ?? "production,salary,cashflow")
      .split(",")
      .filter(Boolean);
    if (selected.some((k) => !kinds.includes(k as Kind)))
      throw new HttpError(400, "Unknown report section.");
    const { data, sections } = await db().$transaction(
      async (tx) => {
        const data = await report(period, tx);
        const sections: PdfSection[] = [];
        const titles = {
            production: "Production",
            salary: "Salary",
            cashflow: "Cash Flow Expenses",
          },
          labels = {
            production: "Total Earn",
            salary: "Net Salary",
            cashflow: "Net Amount",
          };
        if (q.get("detail") !== "summary")
          for (const key of [...new Set(selected)] as Kind[]) {
            const rows = await resource(tx, key).findMany({
              where: {
                voidedAt: null,
                date: { gte: period.start, lt: period.end },
              },
              orderBy: { date: "asc" },
            });
            sections.push({
              kind: key,
              title: titles[key],
              amountLabel: labels[key],
              rows: rows.map((row) => ({
                date: (row.date as Date).toISOString().slice(0, 10),
                ...(key === "production"
                  ? { dailyProduction: String(row.dailyProduction) }
                  : {}),
                amount: String(
                  key === "production"
                    ? row.totalEarn
                    : key === "salary"
                      ? row.netSalary
                      : row.netAmount,
                ),
              })),
            });
          }
        return { data, sections };
      },
      { isolationLevel: "RepeatableRead", timeout: 20000 },
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
