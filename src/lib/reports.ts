import { Prisma } from "@prisma/client";
import { db } from "./db";
import { cashBalance, D, statement } from "./finance";
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
  const start = mode === "daily" ? date(day) : date(month + "-01");
  const end = new Date(start);
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
  const { start, end } = period;
  const range = { gte: start, lt: end };
  const alive = { voidedAt: null };
  const run = async (tx: Prisma.TransactionClient) => {
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: "default" },
    });
    const sum = (v: { _sum: { amount: Prisma.Decimal | null } }) =>
      D(v._sum.amount || 0);
    const [
      rev,
      exp,
      sal,
      received,
      paidExp,
      paidSal,
      otherIn,
      otherOut,
      priorRev,
      priorExp,
      priorSal,
      priorIn,
      priorOut,
      productionTrend,
      expenseTrend,
      salaryTrend,
      breakdown,
      employeeCount,
      unpaidProduction,
      unpaidExpense,
      unpaidSalary,
    ] = await Promise.all([
      tx.production.aggregate({
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.salary.aggregate({
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.production.aggregate({
        where: { ...alive, paidOn: range },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { ...alive, paidOn: range },
        _sum: { amount: true },
      }),
      tx.salary.aggregate({
        where: { ...alive, paidOn: range },
        _sum: { amount: true },
      }),
      tx.cashEntry.aggregate({
        where: { ...alive, date: range, direction: "IN" },
        _sum: { amount: true },
      }),
      tx.cashEntry.aggregate({
        where: { ...alive, date: range, direction: "OUT" },
        _sum: { amount: true },
      }),
      tx.production.aggregate({
        where: { ...alive, paidOn: { lt: start } },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { ...alive, paidOn: { lt: start } },
        _sum: { amount: true },
      }),
      tx.salary.aggregate({
        where: { ...alive, paidOn: { lt: start } },
        _sum: { amount: true },
      }),
      tx.cashEntry.aggregate({
        where: { ...alive, date: { lt: start }, direction: "IN" },
        _sum: { amount: true },
      }),
      tx.cashEntry.aggregate({
        where: { ...alive, date: { lt: start }, direction: "OUT" },
        _sum: { amount: true },
      }),
      tx.production.groupBy({
        by: ["date"],
        where: { ...alive, date: range },
        _sum: { amount: true, quantity: true },
      }),
      tx.expense.groupBy({
        by: ["date"],
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.salary.groupBy({
        by: ["date"],
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.expense.groupBy({
        by: ["category"],
        where: { ...alive, date: range },
        _sum: { amount: true },
      }),
      tx.employee.count({ where: { active: true } }),
      tx.production.aggregate({
        where: { ...alive, date: range, paidOn: null },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { ...alive, date: range, paidOn: null },
        _sum: { amount: true },
      }),
      tx.salary.aggregate({
        where: { ...alive, date: range, paidOn: null },
        _sum: { amount: true },
      }),
    ]);
    const opening = cashBalance(
      workspace.openingDate < end ? workspace.openingCash : 0,
      sum(priorRev).plus(sum(priorIn)),
      sum(priorExp).plus(sum(priorSal)).plus(sum(priorOut)),
    );
    const inflow = sum(received).plus(sum(otherIn));
    const outflow = sum(paidExp).plus(sum(paidSal)).plus(sum(otherOut));
    const trend = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const find = (
        list: typeof productionTrend | typeof expenseTrend | typeof salaryTrend,
      ) =>
        D(list.find((r) => r.date.getTime() === d.getTime())?._sum.amount || 0);
      trend.push({
        day: d.toISOString().slice(0, 10),
        revenue: find(productionTrend).toFixed(2),
        costs: find(expenseTrend).plus(find(salaryTrend)).toFixed(2),
      });
    }
    return {
      workspace,
      period: {
        mode: period.mode,
        label: period.label,
        start: start.toISOString().slice(0, 10),
        end: new Date(end.getTime() - 86400000).toISOString().slice(0, 10),
      },
      totals: {
        ...statement(sum(rev), sum(exp), sum(sal)),
        openingCash: opening,
        cashIn: inflow.toFixed(2),
        cashOut: outflow.toFixed(2),
        closingCash: cashBalance(opening, inflow, outflow),
        cashNet: inflow.minus(outflow).toFixed(2),
        receivable: sum(unpaidProduction).toFixed(2),
        payable: sum(unpaidExpense).plus(sum(unpaidSalary)).toFixed(2),
        units: productionTrend
          .reduce((s, r) => s.plus(r._sum.quantity || 0), D())
          .toString(),
        activeEmployees: employeeCount,
      },
      trend,
      breakdown: breakdown.map((b) => ({
        category: b.category,
        amount: D(b._sum.amount || 0).toFixed(2),
      })),
    };
  };
  return client
    ? run(client)
    : db().$transaction(run, {
        isolationLevel: "RepeatableRead",
        timeout: 30000,
      });
}
