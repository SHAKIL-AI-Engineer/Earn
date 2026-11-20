import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
neonConfig.webSocketConstructor = proxy
  ? class extends WebSocket {
      constructor(address: string, protocols?: string | string[]) {
        super(address, protocols, { agent: new HttpsProxyAgent(proxy!) });
      }
    }
  : WebSocket;

export function createDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  return new PrismaClient({
    adapter: new PrismaNeon(
      {
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 12000,
      },
      { schema: process.env.DATABASE_SCHEMA || "earn" },
    ),
    transactionOptions: { maxWait: 15000, timeout: 20000 },
  });
}
