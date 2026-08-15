import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("exports the public, demo, login, portal and privacy routes", async () => {
  for (const route of ["index.html", "demo/index.html", "login/index.html", "portal/index.html", "privacy/index.html"]) {
    const file = await stat(new URL(`../out/${route}`, import.meta.url));
    assert.ok(file.size > 500, `${route} should contain rendered HTML`);
  }
});

test("export is independent from ChatGPT Sites", async () => {
  const files = await Promise.all(["index.html", "demo/index.html", "login/index.html", "portal/index.html"].map((route) => readFile(new URL(`../out/${route}`, import.meta.url), "utf8")));
  const html = files.join("\n");
  assert.match(html, /EduBonke/);
  assert.doesNotMatch(html, /Sign in with ChatGPT|codex-preview|appgprj_/i);
});

test("demo route includes clearly marked synthetic records", async () => {
  const html = await readFile(new URL("../out/demo/index.html", import.meta.url), "utf8");
  const fixture = await readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8");
  assert.match(html, /Interactive demonstration/);
  assert.match(html, /Mhlabeni Skills College/);
  assert.match(fixture, /example\.invalid/);
  assert.match(fixture, /DEMO-/);
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

test("uses the EduBonke brand identity and colour palette", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const favicon = await readFile(new URL("../out/favicon.svg", import.meta.url), "utf8");
  assert.match(html, /brand-word-bonke/);
  assert.match(favicon, /#132a32/);
  assert.match(favicon, /#087f75/);
  assert.match(favicon, /#e8a33a/);
});
