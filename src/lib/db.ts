import "server-only";
import { neon } from "@neondatabase/serverless";

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  // HTTPS transport works without persistent sockets in serverless runtimes.
  // Create a fresh timeout for each request, never a shared expiring signal.
  return neon(url, {
    fetchOptions: { signal: AbortSignal.timeout(10000), cache: "no-store" },
  });
}
