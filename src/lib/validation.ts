import { z } from "zod";
const text = z.string().trim().min(1).max(160);
export const dateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s &&
      s >= "2000-01-01" &&
      s <= "2100-12-31",
    "Invalid date",
  );
const nonnegative = (max: number, places = 2) =>
  z
    .string()
    .regex(
      new RegExp(`^\\d{1,10}(\\.\\d{1,${places}})?$`),
      `Use up to ${places} decimal places`,
    )
    .refine(
      (s) => Number(s) >= 0 && Number(s) <= max,
      "Value is outside the allowed range",
    );
export const productionInput = z
  .object({
    date: dateText,
    dailyProduction: nonnegative(10000000, 3),
    totalEarn: nonnegative(100000000),
  })
  .strict();
export const salaryInput = z
  .object({ date: dateText, netSalary: nonnegative(100000000) })
  .strict();
export const cashInput = z
  .object({ date: dateText, netAmount: nonnegative(100000000) })
  .strict();
export const userInput = z.object({
  name: text,
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(["admin", "manager", "accountant", "viewer"]),
});
export function date(s: string) {
  return new Date(s + "T00:00:00.000Z");
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
