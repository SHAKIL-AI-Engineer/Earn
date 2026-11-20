import { Prisma } from "@prisma/client";
import { db } from "./db";
export async function cashbook(
  start: Date,
  end: Date,
  search = "",
  page = 1,
  limit = 20,
  client: Prisma.TransactionClient = db(),
  sorting: { sort: "date" | "label" | "amount"; direction: "asc" | "desc" } = {
    sort: "date",
    direction: "desc",
  },
) {
  const schema = process.env.DATABASE_SCHEMA || "earn";
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error("Invalid schema");
  const table = (name: string) => Prisma.raw(`"${schema}"."${name}"`);
  const order = Prisma.raw(
    `${sorting.sort === "amount" ? "amount" : sorting.sort === "label" ? "description" : "date"} ${sorting.direction === "asc" ? "ASC" : "DESC"}, id ASC`,
  );
  return client.$queryRaw<
    Array<{
      id: string;
      date: Date;
      description: string;
      amount: Prisma.Decimal;
      direction: string;
      source: string;
      updatedAt: Date;
      total: bigint;
    }>
  >(Prisma.sql`
 SELECT *, COUNT(*) OVER() AS total FROM (
  SELECT id,"paidOn" AS date,description,amount,'IN' AS direction,'production' AS source,"updatedAt" FROM ${table("earn_production")} WHERE "voidedAt" IS NULL AND "paidOn" >= ${start} AND "paidOn" < ${end}
  UNION ALL SELECT id,"paidOn",description,amount,'OUT','expense',"updatedAt" FROM ${table("earn_expenses")} WHERE "voidedAt" IS NULL AND "paidOn" >= ${start} AND "paidOn" < ${end}
  UNION ALL SELECT s.id,s."paidOn",'Salary: '||e.name,s.amount,'OUT','salary',s."updatedAt" FROM ${table("earn_salaries")} s JOIN ${table("earn_employees")} e ON e.id=s."employeeId" WHERE s."voidedAt" IS NULL AND s."paidOn" >= ${start} AND s."paidOn" < ${end}
  UNION ALL SELECT id,date,description,amount,direction,'cashEntry',"updatedAt" FROM ${table("earn_cash_entries")} WHERE "voidedAt" IS NULL AND date >= ${start} AND date < ${end}
 ) c WHERE description ILIKE ${"%" + search + "%"} ORDER BY ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}
 `);
}
