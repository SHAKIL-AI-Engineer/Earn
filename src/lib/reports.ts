import { Prisma } from "@prisma/client";
import { db } from "./db";
import { D, statement } from "./finance";
import { date, dateText, today } from "./validation";
import { HttpError } from "./http";
export function periodFrom(params: URLSearchParams) {
  const mode = params.get("period") === "daily" ? "daily" : "monthly";
  const day = dateText.parse(params.get("day") || today());
  const month = params.get("month") || day.slice(0, 7);
  if (
    !/^\d{4}-(0[1-9]|1[012])$/.test(month) ||
    month < "2000-01" ||
    month > "2100-12"
  )
    throw new HttpError(400, "Invalid month.");
  const start = date(mode === "daily" ? day : month + "-01"),
    end = new Date(start);
  if (mode === "daily") end.setUTCDate(end.getUTCDate() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    mode,
    day,
    month,
    start,
    end,
    label:
      mode === "daily"
        ? day
        : new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(start),
  };
}
export async function report(
  period: ReturnType<typeof periodFrom>,
  client?: Prisma.TransactionClient,
) {
  const where = { voidedAt: null, date: { gte: period.start, lt: period.end } };
  const run = async (tx: Prisma.TransactionClient) => {
    const [
      workspace,
      production,
      salary,
      cashflow,
      productionDays,
      salaryDays,
      cashDays,
    ] = await Promise.all([
      tx.workspace.findUniqueOrThrow({ where: { id: "default" } }),
      tx.production.aggregate({
        where,
        _sum: { totalEarn: true, dailyProduction: true },
        _count: true,
      }),
      tx.salary.aggregate({ where, _sum: { netSalary: true }, _count: true }),
      tx.cashflow.aggregate({ where, _sum: { netAmount: true }, _count: true }),
      tx.production.groupBy({ by: ["date"], where, _sum: { totalEarn: true } }),
      tx.salary.groupBy({ by: ["date"], where, _sum: { netSalary: true } }),
      tx.cashflow.groupBy({ by: ["date"], where, _sum: { netAmount: true } }),
    ]);
    const earn = D(production._sum.totalEarn || 0),
      pay = D(salary._sum.netSalary || 0),
      expense = D(cashflow._sum.netAmount || 0);
    const trend = [];
    for (
      let d = new Date(period.start);
      d < period.end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const match = (date: Date) => date.getTime() === d.getTime();
      trend.push({
        day: d.toISOString().slice(0, 10),
        revenue: D(
          productionDays.find((r) => match(r.date))?._sum.totalEarn || 0,
        ).toFixed(2),
        costs: D(salaryDays.find((r) => match(r.date))?._sum.netSalary || 0)
          .plus(cashDays.find((r) => match(r.date))?._sum.netAmount || 0)
          .toFixed(2),
      });
    }
    return {
      workspace,
      period: {
        mode: period.mode,
        label: period.label,
        start: period.start.toISOString().slice(0, 10),
        end: new Date(period.end.getTime() - 86400000)
          .toISOString()
          .slice(0, 10),
      },
      totals: {
        ...statement(earn, pay, expense),
        dailyProduction: D(production._sum.dailyProduction || 0).toString(),
        productionDays: production._count,
        salaryDays: salary._count,
        cashflowDays: cashflow._count,
      },
      trend,
    };
  };
  return client
    ? run(client)
    : db().$transaction(run, {
        isolationLevel: "RepeatableRead",
        timeout: 20000,
      });
}
