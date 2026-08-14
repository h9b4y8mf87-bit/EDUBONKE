import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

export async function GET() {
  const started = Date.now();
  try {
    await getDb().run(sql`select 1`);
    return Response.json({ status: "healthy", database: "reachable", checkedAt: new Date().toISOString(), responseMs: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded", database: "unreachable", checkedAt: new Date().toISOString() }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
