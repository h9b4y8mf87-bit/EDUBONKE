import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  var __EDUBONKE_RUNTIME_ENV__: { DB?: D1Database; BUCKET?: R2Bucket } | undefined;
}

export function getRuntimeEnv() {
  return globalThis.__EDUBONKE_RUNTIME_ENV__ ?? {};
}

export function getDb() {
  const env = getRuntimeEnv();
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
