import test from "node:test";
import assert from "node:assert/strict";
import {
  FORMATS, CONCEPTS, buildPrompt, parseAdResponse, drawSeed, randomFigure,
  lengthProblems, generateAd, LIMITS,
} from "../generator.js";

const wiki = { title: "Test Article", summary: "A test summary." };

function lcg(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const goodJson = (over = {}) =>
  JSON.stringify({ brandName: "A", headline: "B", body: "C", punchline: "D", imageQuery: "E", ...over });

function stubFetch(texts) {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    const next = texts.shift();
    if (next instanceof Error) throw next;
    if (typeof next === "number") return { ok: false, status: next };
    return { ok: true, status: 200, json: async () => ({ content: [{ text: next }] }) };
  };
  return { impl, calls };
}

const run = (texts, extra = {}) => {
  const f = stubFetch(texts);
  const p = generateAd({ fetchImpl: f.impl, wikiImpl: () => wiki, rng: lcg(7), ...extra });
  return { f, p };
};

test("format pool has 20 unique entries with required fields", () => {
  assert.equal(FORMATS.length, 20);
  assert.equal(new Set(FORMATS.map((f) => f.type)).size, 20);
  for (const f of FORMATS) assert.ok(f.type && f.hook && f.voice, `incomplete format: ${f.type}`);
});

test("removed risky formats stay removed", () => {
  for (const b of ["Political", "Obituary", "Dating", "TripAdvisor", "Academic", "Church"]) {
    assert.ok(!FORMATS.some((f) => f.type === b), `${b} is back in FORMATS`);
  }
});

test("prompt carries subjects, format fields, seeds and the arc", () => {
  const seed = drawSeed(wiki, lcg(3), { formatType: "Yelp" });
  const p = buildPrompt(seed);
  for (const s of ["Test Article", "A test summary.", seed.subjectB, "Yelp", "SEEDS", "THE ARC", "total breakdown", seed.figure, seed.breakdown]) {
    assert.ok(p.includes(s), `prompt missing: ${s}`);
  }
});

test("prompt keeps the safety rules and the JSON schema", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(4)));
  for (const s of [
    "Never use real names of living or historical people",
    "Never use real business names",
    "Never name real platforms or brands",
    "No street addresses, phone numbers or email addresses",
    "Do not make a spouse or marriage",
  ]) assert.ok(p.includes(s), `missing rule: ${s}`);
  assert.ok(p.includes('{"brandName": "...", "headline": "...", "body": "...", "punchline": "...", "imageQuery": "..."}'));
});

test("prompt no longer carries the example text Haiku copied", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(5)));
  assert.ok(!p.includes("Day 19"));
  assert.ok(!p.includes("snacks, spouses"));
});

test("prompt states the length limits", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(6)));
  assert.ok(p.includes(`Max ${LIMITS.body} characters`));
  assert.ok(p.includes(`Max ${LIMITS.punchline} characters`));
  assert.ok(p.includes(`Max ${LIMITS.headline} characters`));
});

test("drawSeed is deterministic for a given rng and varies across rngs", () => {
  const a = drawSeed(wiki, lcg(11));
  const b = drawSeed(wiki, lcg(11));
  assert.deepEqual(a, b);
  const stakes = new Set();
  for (let i = 1; i < 60; i++) stakes.add(drawSeed(wiki, lcg(i * 13), { formatType: "Warning" }).stake);
  assert.ok(stakes.size > 20, `stakes barely vary: ${stakes.size}`);
});

test("drawSeed rejects unknown formats", () => {
  assert.throws(() => drawSeed(wiki, lcg(1), { formatType: "Nope" }), /Unknown format/);
});

test("Marketplace always draws an incident with B substituted and no stake", () => {
  for (let i = 1; i < 40; i++) {
    const s = drawSeed(wiki, lcg(i), { formatType: "Marketplace" });
    assert.ok(s.situation, "no incident");
    assert.ok(!s.situation.includes("{B}"), "unsubstituted {B}");
    assert.ok(s.situation.includes(s.subjectB));
    assert.equal(s.stake, null);
  }
});

test("Yelp incident follows its chance and forceSituation overrides it", () => {
  let hits = 0;
  for (let i = 1; i <= 400; i++) {
    if (drawSeed(wiki, lcg(i * 977), { formatType: "Yelp" }).situation) hits++;
  }
  assert.ok(hits > 60 && hits < 220, `yelp incident rate off: ${hits}/400`);
  for (let i = 1; i < 20; i++) {
    const s = drawSeed(wiki, lcg(i), { formatType: "Yelp", forceSituation: true });
    assert.ok(s.situation && s.stake === null);
  }
});

test("formats without situations always get a stake", () => {
  const s = drawSeed(wiki, lcg(2), { formatType: "Warning" });
  assert.equal(s.situation, null);
  assert.ok(s.stake);
});

test("objects are drawn as Subject B roughly half the time", () => {
  let objs = 0;
  for (let i = 1; i <= 400; i++) if (drawSeed(wiki, lcg(i * 31)).bIsObject) objs++;
  assert.ok(objs > 140 && objs < 260, `object share off: ${objs}/400`);
  assert.ok(CONCEPTS.length > 0);
});

test("randomFigure avoids 19, 47 and round numbers, and covers all three shapes", () => {
  const kinds = { count: 0, money: 0, measure: 0 };
  for (let i = 1; i <= 2000; i++) {
    const f = randomFigure(lcg(i * 7));
    if (f.startsWith("$")) {
      kinds.money++;
      assert.match(f, /^\$\d+\.\d{2}$/);
    } else if (/^\d+\.\d /.test(f)) {
      kinds.measure++;
    } else {
      kinds.count++;
      const n = parseInt(f, 10);
      assert.ok(n >= 3 && n <= 999 && n % 10 !== 0 && n !== 19 && n !== 47, `bad count: ${f}`);
    }
  }
  assert.ok(kinds.count > 0 && kinds.money > 0 && kinds.measure > 0, JSON.stringify(kinds));
});

test("parseAdResponse accepts plain JSON and fenced JSON", () => {
  assert.equal(parseAdResponse(goodJson()).punchline, "D");
  assert.equal(parseAdResponse("```json\n" + goodJson() + "\n```").brandName, "A");
});

test("parseAdResponse rejects missing, empty and non-JSON", () => {
  assert.throws(() => parseAdResponse('{"brandName":"A","headline":"B","body":"C","imageQuery":"E"}'), /missing fields: punchline/);
  assert.throws(() => parseAdResponse(goodJson({ body: "  " })), /missing fields: body/);
  assert.throws(() => parseAdResponse("sorry, here is your ad"));
});

test("lengthProblems flags each over-limit field and nothing else", () => {
  const ok = { headline: "x".repeat(LIMITS.headline), body: "x".repeat(LIMITS.body), punchline: "x".repeat(LIMITS.punchline) };
  assert.deepEqual(lengthProblems(ok), []);
  const bad = { ...ok, body: "x".repeat(LIMITS.body + 1), punchline: "x".repeat(LIMITS.punchline + 5) };
  assert.deepEqual(lengthProblems(bad).map((p) => p.field), ["body", "punchline"]);
});

test("generateAd happy path makes one API call and returns seed info", async () => {
  const { f, p } = run([goodJson()]);
  const ad = await p;
  assert.equal(f.calls.length, 1);
  assert.equal(ad.retried, false);
  assert.equal(ad.subjectA, "Test Article");
  assert.ok(ad.seed.figure && ad.format);
  assert.equal(f.calls[0].model, "claude-haiku-4-5-20251001");
});

test("generateAd honours formatType and forceSituation", async () => {
  const { p } = run([goodJson()], { formatType: "Yelp", forceSituation: true });
  const ad = await p;
  assert.equal(ad.format, "Yelp");
  assert.ok(ad.seed.situation);
});

test("over-limit output triggers exactly one retry with a 3-message conversation", async () => {
  const long = goodJson({ body: "x".repeat(LIMITS.body + 40) });
  const { f, p } = run([long, goodJson({ body: "short" })]);
  const ad = await p;
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].messages.length, 3);
  assert.equal(f.calls[1].messages[1].role, "assistant");
  assert.match(f.calls[1].messages[2].content, /body is \d+ characters \(max 150\)/);
  assert.equal(ad.body, "short");
  assert.equal(ad.retried, true);
});

test("a retry that is still too long is accepted without a third call", async () => {
  const long = goodJson({ body: "x".repeat(LIMITS.body + 40) });
  const { f, p } = run([long, long]);
  const ad = await p;
  assert.equal(f.calls.length, 2);
  assert.equal(ad.retried, true);
});

test("an unparsable retry keeps the first result", async () => {
  const long = goodJson({ body: "y".repeat(LIMITS.body + 40) });
  const { p } = run([long, "not json at all"]);
  const ad = await p;
  assert.ok(ad.body.startsWith("yyy"));
});

test("API errors throw", async () => {
  const { p } = run([500]);
  await assert.rejects(p, /Anthropic API error: 500/);
});
