import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portal = fs.readFileSync(path.join(root, "app/portal/portal-client.tsx"), "utf8");
const loader = fs.readFileSync(path.join(root, "lib/workspace-loader.ts"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/202608180001_pre_pilot_hardening.sql"),
  "utf8",
);

test("workspace loading no longer silently caps college tables at 500 rows", () => {
  assert.equal(portal.includes(".limit(500)"), false);
  assert.match(loader, /\.range\(from, from \+ PAGE_SIZE - 1\)/);
  assert.match(loader, /QUERY_CONCURRENCY = 6/);
});

test("accepted application conversion is transaction-owned by Postgres", () => {
  assert.match(migration, /enrol_accepted_application/);
  assert.match(migration, /for update/);
  assert.match(migration, /source_application_id/);
  assert.match(portal, /Accepted applicant converted to student and enrolled/);
});

test("evidence rejected status is reachable from the portal UI", () => {
  assert.match(portal, /reviewEvidence\(row, "rejected"\)/);
  assert.match(portal, /Evidence rejected\./);
});
