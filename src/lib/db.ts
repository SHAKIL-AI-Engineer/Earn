import "server-only";
import { createDatabase } from "../../scripts/db-runtime";
const globalDb = globalThis as unknown as {
  earnDatabase?: ReturnType<typeof createDatabase>;
};
export function db() {
  globalDb.earnDatabase ??= createDatabase();
  return globalDb.earnDatabase;
}
