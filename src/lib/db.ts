import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Connect to Neon through its serverless driver instead of the default TCP
// driver. Connections go over a WebSocket to Neon's proxy, which sidesteps the
// raw-TCP connect timeouts we were seeing when the autosuspended compute was
// waking up. In a Node runtime there's no global WebSocket, so supply `ws`.
neonConfig.webSocketConstructor = ws;

// Neon's free tier still autosuspends the compute, so the first queries after an
// idle period can fail transiently while it wakes (P1001/P1002, ConnectionReset,
// connect timeouts). Retrying with a short backoff lets the request succeed once
// Neon is up — this is what stops bursty endpoints like /api/follow from 500ing
// against a cold database.
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return TRANSIENT_CODES.has(err.code);
  if (err instanceof Prisma.PrismaClientInitializationError) return true;

  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
    if (err.cause) parts.push(err.cause instanceof Error ? err.cause.message : String(err.cause));
  } else {
    parts.push(String(err));
  }
  return /can'?t reach database|connection (closed|reset)|ECONNRESET|ETIMEDOUT|fetch failed|connect timeout|UND_ERR_CONNECT_TIMEOUT/i.test(
    parts.join(" "),
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client.$extends({
    query: {
      // Retry every model operation on transient connection failures. Backoff
      // totals ~4.4s, which comfortably covers a Neon cold start.
      async $allOperations({ args, query }) {
        const delays = [200, 500, 1200, 2500];
        let lastErr: unknown;
        for (let attempt = 0; attempt <= delays.length; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            lastErr = err;
            if (attempt === delays.length || !isTransient(err)) throw err;
            await sleep(delays[attempt]);
          }
        }
        throw lastErr;
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
