import { Prisma } from "@prisma/client";
export const D = (n: Prisma.Decimal.Value = 0) => new Prisma.Decimal(n);
export const money = (n: Prisma.Decimal.Value) =>
  D(n).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export const productAmount = (quantity: string, rate: string) =>
  money(D(quantity).times(rate));
export function statement(
  revenue: Prisma.Decimal.Value,
  expenses: Prisma.Decimal.Value,
  salaries: Prisma.Decimal.Value,
) {
  const costs = D(expenses).plus(salaries);
  return {
    revenue: money(revenue).toFixed(2),
    expenses: money(expenses).toFixed(2),
    salaries: money(salaries).toFixed(2),
    costs: money(costs).toFixed(2),
    net: money(D(revenue).minus(costs)).toFixed(2),
  };
}
export function cashBalance(
  opening: Prisma.Decimal.Value,
  incoming: Prisma.Decimal.Value,
  outgoing: Prisma.Decimal.Value,
) {
  return money(D(opening).plus(incoming).minus(outgoing)).toFixed(2);
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
