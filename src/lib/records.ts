import { Prisma } from "@prisma/client";
import { db } from "./db";
import { audit, HttpError } from "./http";
import { canWrite, type Kind } from "./permissions";
import { cashInput, date, productionInput, salaryInput } from "./validation";
import { money } from "./finance";
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
  const { id: rawId, updatedAt, ...fields } = input;
  const id = typeof rawId === "string" ? rawId : undefined;
  if (method !== "POST" && !id)
    throw new HttpError(400, "A record ID is required.");
  if (method === "POST" && id && !/^[0-9a-f-]{36}$/.test(id))
    throw new HttpError(400, "Invalid request ID.");
  let data: Record<string, unknown> = {};
  if (method !== "DELETE") {
    const p =
      kind === "production"
        ? productionInput.parse(fields)
        : kind === "salary"
          ? salaryInput.parse(fields)
          : cashInput.parse(fields);
    data = { ...p, date: date(p.date) };
    const amountKey =
      kind === "production"
        ? "totalEarn"
        : kind === "salary"
          ? "netSalary"
          : "netAmount";
    data[amountKey] = money(String(data[amountKey]));
    const workspace = await db().workspace.findUniqueOrThrow({
      where: { id: "default" },
    });
    if ((data.date as Date) < workspace.openingDate)
      throw new HttpError(
        400,
        "The entry date is before the workspace opening date.",
      );
  }
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${kind}))::text AS locked`;
    const model = resource(tx, kind);
    const before =
      id && method !== "POST"
        ? await model.findUnique({ where: { id } })
        : null;
    if (method !== "POST" && (!before || before.voidedAt))
      throw new HttpError(404, "Record not found.");
    if (
      before &&
      (typeof updatedAt !== "string" ||
        before.updatedAt.toISOString() !== updatedAt)
    )
      throw new HttpError(409, "This record changed. Refresh and try again.");
    if (method !== "DELETE") {
      const duplicate = await model.findMany({
        where: {
          date: data.date,
          voidedAt: null,
          ...(id ? { id: { not: id } } : {}),
        },
        take: 1,
      });
      if (duplicate.length)
        throw new HttpError(
          409,
          "This date already has a daily total. Edit that record instead.",
        );
    }
    const after =
      method === "DELETE"
        ? await model.update({ where: { id }, data: { voidedAt: new Date() } })
        : method === "PATCH"
          ? await model.update({ where: { id }, data })
          : await model.create({
              data: { ...data, ...(id ? { id } : {}), createdBy: user.id },
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
