import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../images.js", import.meta.url), "utf8");

test("images.js avoids the deprecated node-fetch buffer()", () => {
  assert.ok(!/\.buffer\(\)/.test(src), "response.buffer() is deprecated");
  assert.ok(src.includes("arrayBuffer()"));
});

test("Buffer.from(arrayBuffer) yields the original bytes", async () => {
  const bytes = new Uint8Array([1, 2, 3, 250]);
  const res = new Response(bytes);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.deepEqual([...buf], [1, 2, 3, 250]);
});
