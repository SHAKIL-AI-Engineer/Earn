import { getDatabase } from "@/lib/db";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store, max-age=0" };
  try {
    const startedAt = performance.now();
    await getDatabase().query("SELECT 1 AS ok");
    return Response.json({
      status: "connected",
      latencyMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
    }, { headers });
  } catch {
    console.error("Database health check failed");
    return Response.json({ status: "unavailable", message: "Database connection unavailable" }, { status: 503, headers });
  }
}
