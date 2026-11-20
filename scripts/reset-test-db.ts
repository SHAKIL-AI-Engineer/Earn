import { neon } from "@neondatabase/serverless";
const schema = process.env.DATABASE_SCHEMA;
if (!schema || !/^earn_test_[a-z0-9_]+$/.test(schema))
  throw new Error("Only disposable earn_test_ schemas may be reset");
const sql = neon(process.env.DATABASE_URL!);
sql
  .query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  .then(() => console.log("Disposable test schema removed"))
  .catch(() => {
    console.error("Test schema cleanup failed");
    process.exitCode = 1;
  });
