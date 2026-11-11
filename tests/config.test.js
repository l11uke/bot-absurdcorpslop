import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const jsFiles = readdirSync(root).filter((f) => f.endsWith(".js"));

const used = new Set();
for (const f of jsFiles) {
  const src = readFileSync(new URL(f, root), "utf8");
  for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) used.add(m[1]);
}

const example = readFileSync(new URL(".env.example", root), "utf8");
const documented = new Set(
  [...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1])
);

test("every env key used in code appears in .env.example", () => {
  for (const k of used) assert.ok(documented.has(k), `${k} missing from .env.example`);
});

test("every key in .env.example is used in code", () => {
  for (const k of documented) assert.ok(used.has(k), `${k} in .env.example but unused`);
});

test(".env.example holds placeholders only", () => {
  assert.ok(!/sk-ant-/.test(example), "Anthropic key pattern in .env.example");
  assert.ok(example.includes("your_anthropic_api_key_here"));
});
