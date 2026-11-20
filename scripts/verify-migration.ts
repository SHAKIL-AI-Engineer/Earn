import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { createDatabase } from "./db-runtime";
const schema = process.env.DATABASE_SCHEMA;
if (!schema || !/^earn_test_[a-z0-9_]+$/.test(schema))
  throw new Error(
    "Migration verification requires a disposable earn_test_ schema",
  );
const sql = neon(process.env.DATABASE_URL!);
const statements = (name: string) =>
  readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8")
    .replace(/^--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
async function main() {
  await sql.query(`CREATE SCHEMA "${schema}"`);
  for (const name of [
    "202611200001_initial",
    "202611200002_integrity",
    "202611200003_bdt_currency",
  ])
    await sql.transaction([
      sql.query(`SET LOCAL search_path TO "${schema}"`),
      ...statements(name).map((s) => sql.query(s)),
    ]);
  await sql.transaction([
    sql.query(`SET LOCAL search_path TO "${schema}"`),
    sql.query(
      `INSERT INTO earn_employees(id,code,name,position,"dailyRate","updatedAt") VALUES ('worker1','EMP1','One','Operator',40,now()),('worker2','EMP2','Two','Operator',30,now())`,
    ),
    sql.query(
      `INSERT INTO earn_salaries(id,date,"employeeId","daysWorked","dailyRate",amount,"createdBy","updatedAt") VALUES ('old-salary1','2026-11-01','worker1',0.5,40,20,'test',now()),('old-salary2','2026-11-01','worker2',1,30,30,'test',now())`,
    ),
    sql.query(
      `INSERT INTO earn_production(id,date,description,quantity,"unitRate",amount,"createdBy","updatedAt") VALUES ('old-prod1','2026-11-01','One',10,2,20,'test',now()),('old-prod2','2026-11-01','Two',5,3,15,'test',now())`,
    ),
    sql.query(
      `INSERT INTO earn_cash_entries(id,date,description,direction,amount,"createdBy","updatedAt") VALUES ('old-out','2026-11-01','Out','OUT',7,'test',now()),('old-in','2026-11-01','In','IN',99,'test',now())`,
    ),
    sql.query(
      `INSERT INTO earn_expenses(id,date,description,category,amount,"createdBy","updatedAt") VALUES ('old-expense','2026-11-01','Expense','Other',8,'test',now())`,
    ),
  ]);
  await sql.transaction([
    sql.query(`SET LOCAL search_path TO "${schema}"`),
    ...statements("202611200004_simple_daily_records").map((s) => sql.query(s)),
  ]);
  const p = createDatabase();
  try {
    const [salaries, production, cashflow] = await Promise.all([
      p.salary.findMany({ where: { voidedAt: null } }),
      p.production.findMany({ where: { voidedAt: null } }),
      p.cashflow.findMany({ where: { voidedAt: null } }),
    ]);
    if (
      salaries.length !== 1 ||
      String(salaries[0].netSalary) !== "50" ||
      production.length !== 1 ||
      String(production[0].dailyProduction) !== "15" ||
      String(production[0].totalEarn) !== "35" ||
      cashflow.length !== 1 ||
      String(cashflow[0].netAmount) !== "15"
    )
      throw new Error("Daily aggregate values differ");
    const archived = await sql.query(
      `SELECT count(*)::int AS n FROM "${schema}".earn_salaries WHERE "voidedAt" IS NOT NULL`,
    );
    if (archived[0].n !== 2) throw new Error("Legacy rows not retained");
    console.log(
      "PASS: legacy totals consolidated by date, expenses combined, contributions excluded, original rows retained",
    );
  } finally {
    await p.$disconnect();
  }
}
main().catch(() => {
  console.error("Migration verification failed");
  process.exitCode = 1;
});
