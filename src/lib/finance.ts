import { Prisma } from "@prisma/client";
export const D = (n: Prisma.Decimal.Value = 0) => new Prisma.Decimal(n);
export const money = (n: Prisma.Decimal.Value) =>
  D(n).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export function statement(
  totalEarn: Prisma.Decimal.Value,
  netSalary: Prisma.Decimal.Value,
  netAmount: Prisma.Decimal.Value,
) {
  const costs = D(netSalary).plus(netAmount);
  return {
    totalEarn: money(totalEarn).toFixed(2),
    netSalary: money(netSalary).toFixed(2),
    netAmount: money(netAmount).toFixed(2),
    totalCost: money(costs).toFixed(2),
    netBalance: money(D(totalEarn).minus(costs)).toFixed(2),
  };
}
export const CURRENCY_CODE = "BDT";
export const CURRENCY_SYMBOL = "৳";
const numberFormatter = new Intl.NumberFormat("en-BD", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function formatMoney(n: string | number) {
  const value = Number(n);
  return `${value < 0 ? "-" : ""}${CURRENCY_SYMBOL}\u00a0${numberFormatter.format(Math.abs(value))}`;
}
