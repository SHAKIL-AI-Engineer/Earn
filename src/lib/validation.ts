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
const decimal = (max: number, places = 2) =>
  z
    .string()
    .regex(
      new RegExp(`^\\d{1,10}(\\.\\d{1,${places}})?$`),
      `Use up to ${places} decimal places`,
    )
    .refine(
      (s) => Number(s) > 0 && Number(s) <= max,
      "Value is outside the allowed range",
    );
const common = {
  date: dateText,
  notes: z.string().trim().max(1000).default(""),
  paidOn: dateText.nullable().default(null),
};
export const categories = [
  "Materials",
  "Rent",
  "Utilities",
  "Transport",
  "Maintenance",
  "Office",
  "Other",
] as const;
export const productionInput = z.object({
  ...common,
  description: text,
  quantity: decimal(10000000, 3),
  unit: text.max(25).default("pieces"),
  unitRate: decimal(1000000),
});
export const expenseInput = z.object({
  ...common,
  description: text,
  category: z.enum(categories),
  amount: decimal(100000000),
});
export const salaryInput = z.object({
  ...common,
  employeeId: z.string().min(1).max(100),
  daysWorked: decimal(1),
  dailyRate: decimal(1000000),
});
export const cashInput = z.object({
  date: dateText,
  description: text,
  direction: z.enum(["IN", "OUT"]),
  amount: decimal(100000000),
  notes: common.notes,
});
export const employeeInput = z.object({
  code: text.max(30),
  name: text,
  position: text.max(80),
  dailyRate: decimal(1000000),
  active: z.boolean().default(true),
});
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
