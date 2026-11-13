import test from "node:test";
import assert from "node:assert/strict";
import {
  FORMATS, CONCEPTS, buildPrompt, parseAdResponse, drawSeed, randomFigure,
  lengthProblems, generateAd, LIMITS, limitsFor, wordsFor,
  forbiddenBrandWords, brandProblems, MAX_REPAIRS,
  getWikiArticle, parseWikiResponse, WIKI_USER_AGENT,
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

test("prompt states word budgets", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(6), { formatType: "Warning" }));
  const w = wordsFor("Warning");
  assert.ok(p.includes(`Max ${w.body} words`));
  assert.ok(p.includes(`Max ${w.punchline} words`));
  assert.ok(p.includes(`Max ${w.headline} words`));
  assert.ok(!/Max \d+ characters/.test(p), "character limits leaked into prompt");
});

test("Marketplace gets its own limits, structure note and they appear in the prompt", () => {
  const l = limitsFor("Marketplace");
  assert.ok(l.body > LIMITS.body && l.punchline < LIMITS.punchline);
  assert.deepEqual(limitsFor("Warning"), LIMITS);
  const p = buildPrompt(drawSeed(wiki, lcg(8), { formatType: "Marketplace" }));
  assert.ok(p.includes(`Max ${wordsFor("Marketplace").body} words`));
  assert.ok(p.includes("Format structure:"));
  assert.ok(p.includes("exactly three messages"));
  assert.ok(p.includes("at most 9 words"));
  const w = buildPrompt(drawSeed(wiki, lcg(8), { formatType: "Warning" }));
  assert.ok(!w.includes("Format structure:"));
});

test("every format's body + punchline fits Bluesky post 2 (300 incl. newline)", () => {
  for (const f of FORMATS) {
    const l = limitsFor(f.type);
    assert.ok(l.body + 1 + l.punchline <= 300, `${f.type} overflows: ${l.body}+${l.punchline}`);
  }
});

test("incident prompts require the premise in the headline or first sentence", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(9), { formatType: "Yelp", forceSituation: true }));
  assert.ok(p.includes("must state this incident literally"));
  const q = buildPrompt(drawSeed(wiki, lcg(9), { formatType: "Warning" }));
  assert.ok(!q.includes("must state this incident literally"));
});

test("brand name rule bans place names, titles, personal names and title words", () => {
  const p = buildPrompt(drawSeed(wiki, lcg(10)));
  assert.ok(p.includes("Never put place names, titles of films, books or songs, or personal names from Subject A in the brand name"));
  assert.ok(p.includes("never reuse a word from Subject A's title"));
});

test("an ending shape is drawn about 75% of the time and appears in the prompt as a statement rule", () => {
  let n = 0;
  for (let i = 1; i <= 400; i++) if (drawSeed(wiki, lcg(i * 53)).ending) n++;
  assert.ok(n > 270 && n < 330, `ending rate off: ${n}/400`);
  let withEnding, without;
  for (let i = 1; i < 200 && !(withEnding && without); i++) {
    const s = drawSeed(wiki, lcg(i));
    if (s.ending) withEnding = s; else without = s;
  }
  const a = buildPrompt(withEnding);
  assert.ok(a.includes("Punchline shape: " + withEnding.ending));
  assert.ok(a.includes("never a question and never a request"));
  assert.ok(!buildPrompt(without).includes("Punchline shape"));
});

test("forbiddenBrandWords takes title words and long capitalised summary words", () => {
  const w = forbiddenBrandWords({ title: "Saint-Alphonse, Quebec", summary: "A parish near Cattaraugus County. It is small." });
  assert.ok(w.includes("alphonse") && w.includes("quebec") && w.includes("saint"));
  assert.ok(w.includes("cattaraugus"));
  assert.ok(!w.includes("small") && !w.includes("a"));
});

test("brandProblems flags brand names that reuse Subject A words", () => {
  const w = { title: "Saint-Alphonse, Quebec", summary: "" };
  assert.deepEqual(brandProblems({ brandName: "Alphonse Asymptotic" }, w), [{ field: "brandName", word: "alphonse" }]);
  assert.deepEqual(brandProblems({ brandName: "Wobble Holdings" }, w), []);
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

test("lengthProblems honours custom limits", () => {
  const ad = { headline: "h", body: "x".repeat(200), punchline: "p" };
  assert.equal(lengthProblems(ad).length, 1);
  assert.equal(lengthProblems(ad, limitsFor("Marketplace")).length, 0);
});

test("lengthProblems flags each over-limit field and nothing else", () => {
  const ok = { headline: "x".repeat(LIMITS.headline), body: "x".repeat(LIMITS.body), punchline: "x".repeat(LIMITS.punchline) };
  assert.deepEqual(lengthProblems(ok), []);
  const bad = { ...ok, body: "x".repeat(LIMITS.body + 1), punchline: "x".repeat(LIMITS.punchline + 5) };
  assert.deepEqual(lengthProblems(bad).map((p) => p.field), ["body", "punchline"]);
});

test("generateAd reports first-draft problems, and a Marketplace body of 200 needs no retry", async () => {
  const body = "x".repeat(200);
  const m = run([goodJson({ body })], { formatType: "Marketplace" });
  const ad = await m.p;
  assert.equal(m.f.calls.length, 1);
  assert.deepEqual(ad.firstProblems, []);
  const w = run([goodJson({ body }), goodJson()], { formatType: "Warning" });
  const ad2 = await w.p;
  assert.equal(ad2.firstProblems[0].field, "body");
  assert.equal(ad2.retried, true);
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
  const { f, p } = run([long, goodJson({ body: "short" })], { formatType: "Warning" });
  const ad = await p;
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].messages.length, 3);
  assert.equal(f.calls[1].messages[1].role, "assistant");
  assert.match(f.calls[1].messages[2].content, new RegExp(`body is \\d+ characters \\(max ${LIMITS.body}, about ${wordsFor("Warning").body} words\\)`));
  assert.equal(ad.body, "short");
  assert.equal(ad.retried, true);
});

test("a repair that is still too long gets one more try, then is accepted", async () => {
  const long = goodJson({ body: "x".repeat(LIMITS.body + 40) });
  const { f, p } = run([long, long, long, long], { formatType: "Warning" });
  const ad = await p;
  assert.equal(MAX_REPAIRS, 2);
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[2].messages.length, 5);
  assert.equal(ad.repairs, 2);
  assert.equal(ad.finalProblems[0].field, "body");
});

test("the second repair is used when the first is still over", async () => {
  const long = goodJson({ body: "x".repeat(LIMITS.body + 40) });
  const { f, p } = run([long, long, goodJson({ body: "ok" })], { formatType: "Warning" });
  const ad = await p;
  assert.equal(f.calls.length, 3);
  assert.equal(ad.body, "ok");
  assert.equal(ad.repairs, 2);
  assert.deepEqual(ad.finalProblems, []);
});

test("a brand name that reuses a Subject A word triggers a repair", async () => {
  const bad = goodJson({ brandName: "Test Holdings" });
  const { f, p } = run([bad, goodJson({ brandName: "Wobble Co" })], { formatType: "Warning" });
  const ad = await p;
  assert.equal(f.calls.length, 2);
  assert.match(f.calls[1].messages[2].content, /brandName contains "test"/);
  assert.equal(ad.brandName, "Wobble Co");
  assert.equal(ad.firstProblems[0].word, "test");
});

test("an API error during a repair throws", async () => {
  const long = goodJson({ body: "x".repeat(LIMITS.body + 40) });
  const { p } = run([long, 500], { formatType: "Warning" });
  await assert.rejects(p, /Anthropic API error: 500/);
});

test("an unparsable retry keeps the first result", async () => {
  const long = goodJson({ body: "y".repeat(LIMITS.body + 40) });
  const { p } = run([long, "not json at all"], { formatType: "Warning" });
  const ad = await p;
  assert.ok(ad.body.startsWith("yyy"));
});

test("API errors throw", async () => {
  const { p } = run([500]);
  await assert.rejects(p, /Anthropic API error: 500/);
});

test("default body limit is 195 and default body word budget is 30", () => {
  assert.equal(LIMITS.body, 195);
  assert.equal(wordsFor("Warning").body, 30);
});

test("parseWikiResponse reads title and trims the summary to 300", () => {
  const out = parseWikiResponse(JSON.stringify({ title: "T", extract: "x".repeat(500) }));
  assert.equal(out.title, "T");
  assert.equal(out.summary.length, 300);
  assert.equal(parseWikiResponse(JSON.stringify({ title: "T" })).summary, "");
});

test("parseWikiResponse gives a readable error for rate-limit text and missing titles", () => {
  assert.throws(() => parseWikiResponse("You are making too many requests to the API."), /non-JSON response: You are making too many/);
  assert.throws(() => parseWikiResponse("{}"), /no title/);
});

test("getWikiArticle retries once after a pause and then succeeds", () => {
  const replies = ["You are making too many requests", JSON.stringify({ title: "Ok", extract: "s" })];
  const sleeps = [];
  const out = getWikiArticle({ curl: () => replies.shift(), sleep: (s) => sleeps.push(s) });
  assert.equal(out.title, "Ok");
  assert.deepEqual(sleeps, [3]);
});

test("getWikiArticle throws a readable error after two failures", () => {
  let n = 0;
  assert.throws(
    () => getWikiArticle({ curl: () => { n++; return "nope"; }, sleep: () => {} }),
    /Wikipedia fetch failed twice: Wikipedia returned a non-JSON response/
  );
  assert.equal(n, 2);
});

test("the Wikipedia call identifies the bot with a User-Agent", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../generator.js", import.meta.url), "utf8");
  assert.ok(src.includes('-A "${WIKI_USER_AGENT}"'));
  assert.match(WIKI_USER_AGENT, /^bot-absurdcorpslop\/\d/);
});
