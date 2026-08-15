import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("exports the public, login, portal and privacy routes", async () => {
  for (const route of ["index.html", "login/index.html", "portal/index.html", "privacy/index.html"]) {
    const file = await stat(new URL(`../out/${route}`, import.meta.url));
    assert.ok(file.size > 500, `${route} should contain rendered HTML`);
  }
});

test("export is independent from ChatGPT Sites", async () => {
  const files = await Promise.all(["index.html", "login/index.html", "portal/index.html"].map((route) => readFile(new URL(`../out/${route}`, import.meta.url), "utf8")));
  const html = files.join("\n");
  assert.match(html, /EduBonke/);
  assert.doesNotMatch(html, /Sign in with ChatGPT|codex-preview|appgprj_/i);
});

test("includes the installable web-app assets", async () => {
  await stat(new URL("../out/manifest.webmanifest", import.meta.url));
  await stat(new URL("../out/sw.js", import.meta.url));
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  if (process.env.GITHUB_ACTIONS === "true") {
    assert.match(html, /\/EDUBONKE\/manifest\.webmanifest/);
    assert.match(html, /\/EDUBONKE\/favicon\.svg/);
  }
});
