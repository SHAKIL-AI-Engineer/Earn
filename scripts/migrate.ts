import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const schema = process.env.DATABASE_SCHEMA || "earn";
if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema))
  throw new Error("Invalid DATABASE_SCHEMA");
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await sql.query(
    `CREATE TABLE IF NOT EXISTS "${schema}"."_earn_migrations" (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  for (const name of readdirSync("prisma/migrations")
    .sort()
    .filter((n) => /^\d/.test(n))) {
    const source = readFileSync(
      `prisma/migrations/${name}/migration.sql`,
      "utf8",
    );
    const checksum = createHash("sha256").update(source).digest("hex");
    const existing = await sql.query(
      `SELECT checksum FROM "${schema}"."_earn_migrations" WHERE name = $1`,
      [name],
    );
    if (existing.length) {
      if (existing[0].checksum !== checksum)
        throw new Error(`Migration checksum differs: ${name}`);
      console.log(`Already applied: ${name}`);
      continue;
    }
    const statements = source
      .replace(/^--.*$/gm, "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    await sql.transaction([
      sql.query(`SET LOCAL search_path TO "${schema}"`),
      sql.query(`SELECT pg_advisory_xact_lock(74189231)`),
      ...statements.map((s) => sql.query(s)),
      sql.query(
        `INSERT INTO "${schema}"."_earn_migrations" (name, checksum) VALUES ($1, $2)`,
        [name, checksum],
      ),
    ]);
    console.log(`Applied: ${name} (${statements.length} statements)`);
  }
}
main().catch(() => {
  console.error(
    "Migration failed; transaction rolled back. Check database access and migration files.",
  );
  process.exitCode = 1;
});
