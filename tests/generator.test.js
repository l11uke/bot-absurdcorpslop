import test from "node:test";
import assert from "node:assert/strict";
import { FORMATS, CONCEPTS, buildPrompt, parseAdResponse } from "../generator.js";

const wiki = { title: "Test Article", summary: "A test summary." };
const format = { type: "Yelp", hook: "I don't normally do this but...", voice: "grievance spiral" };
const concept = "a test concept";

test("format pool has 19 unique entries with required fields", () => {
  assert.equal(FORMATS.length, 19);
  assert.equal(new Set(FORMATS.map((f) => f.type)).size, 19);
  for (const f of FORMATS) {
    assert.ok(f.type && f.hook && f.voice, `incomplete format: ${f.type}`);
  }
});

test("removed risky formats stay removed", () => {
  const banned = ["Political", "Obituary", "Dating", "TripAdvisor", "Academic", "Church"];
  for (const b of banned) {
    assert.ok(!FORMATS.some((f) => f.type === b), `${b} is back in FORMATS`);
  }
});

test("concept pool has 300+ unique non-empty entries", () => {
  assert.ok(CONCEPTS.length >= 300, `only ${CONCEPTS.length}`);
  assert.equal(new Set(CONCEPTS).size, CONCEPTS.length, "duplicate concepts");
  for (const c of CONCEPTS) assert.ok(c.trim().length > 0);
});

test("prompt carries both subjects, format fields and the arc rules", () => {
  const p = buildPrompt(format, wiki, concept);
  for (const s of ["Test Article", "A test summary.", "a test concept", "Yelp", "grievance spiral", "THE ARC", "total breakdown"]) {
    assert.ok(p.includes(s), `prompt missing: ${s}`);
  }
});

test("prompt keeps the safety rules and the body/punchline schema", () => {
  const p = buildPrompt(format, wiki, concept);
  assert.ok(p.includes("Never use real names of living or historical people"));
  assert.ok(p.includes("Never use real business names"));
  assert.ok(p.includes('{"brandName": "...", "headline": "...", "body": "...", "punchline": "...", "imageQuery": "..."}'));
  assert.ok(!p.includes("adCopy"), "stale adCopy field in prompt");
});

test("parseAdResponse accepts plain JSON", () => {
  const out = parseAdResponse('{"brandName":"A","headline":"B","body":"C","punchline":"D","imageQuery":"E"}');
  assert.equal(out.punchline, "D");
});

test("parseAdResponse strips markdown fences", () => {
  const fenced = '```json\n{"brandName":"A","headline":"B","body":"C","punchline":"D","imageQuery":"E"}\n```';
  assert.equal(parseAdResponse(fenced).brandName, "A");
});

test("parseAdResponse rejects missing or empty fields", () => {
  assert.throws(
    () => parseAdResponse('{"brandName":"A","headline":"B","body":"C","imageQuery":"E"}'),
    /missing fields: punchline/
  );
  assert.throws(
    () => parseAdResponse('{"brandName":"A","headline":"B","body":"  ","punchline":"D","imageQuery":"E"}'),
    /missing fields: body/
  );
});

test("parseAdResponse rejects non-JSON", () => {
  assert.throws(() => parseAdResponse("sorry, here is your ad"));
});
