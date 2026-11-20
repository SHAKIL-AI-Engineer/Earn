import { Prisma } from "@prisma/client";
import { db } from "./db";
import { audit, HttpError } from "./http";
import { canWrite, type Kind } from "./permissions";
import {
  cashInput,
  date,
  employeeInput,
  expenseInput,
  productionInput,
  salaryInput,
} from "./validation";
import { D, productAmount } from "./finance";
export type Row = Record<string, unknown> & {
  id: string;
  updatedAt: Date;
  voidedAt?: Date | null;
};
type Delegate = {
  findUnique(args: object): Promise<Row | null>;
  findMany(args: object): Promise<Row[]>;
  count(args: object): Promise<number>;
  create(args: object): Promise<Row>;
  update(args: object): Promise<Row>;
};
export function resource(tx: Prisma.TransactionClient, kind: Kind) {
  return tx[kind] as unknown as Delegate;
}

export async function mutateRecord(
  kind: Kind,
  method: string,
  input: Record<string, unknown>,
  user: { id: string; name: string; role: string },
) {
  if (!canWrite(user.role, kind))
    throw new HttpError(403, "Your role cannot change these records.");
  const id = typeof input.id === "string" ? input.id : undefined;
  if (method !== "POST" && !id)
    throw new HttpError(400, "A record ID is required.");
  if (method === "POST" && id && !/^[0-9a-f-]{36}$/.test(id))
    throw new HttpError(400, "Invalid request ID.");
  const workspace = await db().workspace.findUniqueOrThrow({
    where: { id: "default" },
  });
  let data: Record<string, unknown> = {};
  if (method !== "DELETE") {
    if (kind === "employee") data = employeeInput.parse(input);
    else if (kind === "production") {
      const p = productionInput.parse(input);
      data = {
        ...p,
        amount: productAmount(p.quantity, p.unitRate),
        date: date(p.date),
        paidOn: p.paidOn ? date(p.paidOn) : null,
      };
    } else if (kind === "expense") {
      const p = expenseInput.parse(input);
      data = {
        ...p,
        date: date(p.date),
        paidOn: p.paidOn ? date(p.paidOn) : null,
      };
    } else if (kind === "salary") {
      const p = salaryInput.parse(input);
      data = {
        ...p,
        amount: productAmount(p.daysWorked, p.dailyRate),
        date: date(p.date),
        paidOn: p.paidOn ? date(p.paidOn) : null,
      };
    } else {
      const p = cashInput.parse(input);
      data = { ...p, date: date(p.date) };
    }
    if (
      data.amount &&
      (D(String(data.amount)).lte(0) ||
        D(String(data.amount)).gt("999999999999.99"))
    )
      throw new HttpError(
        400,
        "The calculated total must be between $0.01 and $999,999,999,999.99.",
      );
    if (data.date instanceof Date && data.date < workspace.openingDate)
      throw new HttpError(
        400,
        "The entry date is before the workspace opening date.",
      );
    if (
      data.paidOn instanceof Date &&
      data.date instanceof Date &&
      data.paidOn < data.date
    )
      throw new HttpError(
        400,
        "Payment date must be on or after the entry date.",
      );
  }
  return db().$transaction(async (tx) => {
    // Serialize salary duplicate checks and updates, including last-writer checks.
    if (kind === "salary")
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(74189232)::text AS locked`;
    if (id && method !== "POST")
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text AS locked`;
    const model = resource(tx, kind);
    const before =
      id && method !== "POST"
        ? await model.findUnique({ where: { id } })
        : null;
    if (method !== "POST" && (!before || before.voidedAt))
      throw new HttpError(404, "Record was not found.");
    if (
      before &&
      (typeof input.updatedAt !== "string" ||
        before.updatedAt.toISOString() !== input.updatedAt)
    )
      throw new HttpError(
        409,
        "This record changed since you opened it. Refresh and try again.",
      );
    if (kind === "salary" && method !== "DELETE") {
      const employee = await tx.employee.findUnique({
        where: { id: String(data.employeeId) },
      });
      if (!employee || !employee.active)
        throw new HttpError(400, "Select an active employee.");
      const duplicate = await tx.salary.findFirst({
        where: {
          employeeId: String(data.employeeId),
          date: data.date as Date,
          voidedAt: null,
          ...(id ? { id: { not: id } } : {}),
        },
      });
      if (duplicate)
        throw new HttpError(
          409,
          "Salary is already recorded for this employee on this day.",
        );
    }
    let after: Row;
    if (method === "DELETE") {
      if (kind === "employee")
        throw new HttpError(
          400,
          "Employees cannot be deleted. Set the employee to inactive instead.",
        );
      after = await model.update({
        where: { id },
        data: { voidedAt: new Date() },
      });
    } else if (method === "PATCH")
      after = await model.update({ where: { id }, data });
    else
      after = await model.create({
        data: {
          ...data,
          ...(id ? { id } : {}),
          ...(kind !== "employee" ? { createdBy: user.id } : {}),
        },
      });
    await audit(
      tx,
      user,
      method === "DELETE" ? "VOID" : method === "POST" ? "CREATE" : "UPDATE",
      kind,
      after.id,
      before,
      after,
    );
    return after;
  });
}
