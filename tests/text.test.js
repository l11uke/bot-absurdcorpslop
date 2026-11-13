import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { truncateAtSentence, buildPostTexts, POST_MAX, TAGS } from "../text.js";

test("short text is returned unchanged", () => {
  assert.equal(truncateAtSentence("Short one.", 50), "Short one.");
});

test("long text is cut at the last sentence end inside the limit, with no ellipsis", () => {
  const s = "First sentence here. Second sentence follows. Third one is far too long to fit inside.";
  const out = truncateAtSentence(s, 50);
  assert.equal(out, "First sentence here. Second sentence follows.");
  assert.ok(!out.includes("…"));
});

test("sentence ends followed by a closing quote are respected", () => {
  const out = truncateAtSentence('He said "stop." Then he kept going for a long time after that.', 25);
  assert.equal(out, 'He said "stop."');
});

test("without a usable sentence end it cuts at a word and adds an ellipsis", () => {
  const out = truncateAtSentence("one two three four five six seven eight nine ten", 20);
  assert.ok(out.endsWith("…"));
  assert.ok(out.length <= 20, `too long: ${out.length}`);
  assert.ok(!/ …$/.test(out));
});

test("a sentence end too early in the text is skipped in favour of a word cut", () => {
  const out = truncateAtSentence("Hi. " + "word ".repeat(40), 60);
  assert.ok(out.endsWith("…"));
  assert.ok(out.length <= 60);
});

test("result never exceeds max", () => {
  for (const max of [10, 25, 60, 120]) {
    const out = truncateAtSentence("alpha beta. ".repeat(30) + "gamma delta epsilon", max);
    assert.ok(out.length <= max, `${out.length} > ${max}`);
  }
});

test("buildPostTexts builds both posts inside 300 characters and keeps the punchline intact", () => {
  const ad = {
    format: "Yelp", brandName: "Brand Name", headline: "H".repeat(400),
    body: "Sentence one is here. " + "filler words ".repeat(60), punchline: "The punchline survives whole.",
  };
  const { post1, post2 } = buildPostTexts(ad);
  assert.ok(post1.length <= POST_MAX, `post1 ${post1.length}`);
  assert.ok(post2.length <= POST_MAX, `post2 ${post2.length}`);
  assert.ok(post1.startsWith("[YELP]\nBrand Name\n"));
  assert.ok(post1.endsWith(TAGS));
  assert.ok(post2.endsWith("\nThe punchline survives whole."));
  assert.ok(post2.startsWith("Sentence one is here."));
});

test("every format limit pair fits post 2 once text is built", async () => {
  const { FORMATS } = await import("../pools.js");
  const { limitsFor } = await import("../generator.js");
  for (const f of FORMATS) {
    const l = limitsFor(f.type);
    const { post2 } = buildPostTexts({
      format: f.type, brandName: "B", headline: "h",
      body: "b".repeat(l.body), punchline: "p".repeat(l.punchline),
    });
    assert.ok(post2.length <= POST_MAX, `${f.type} post2 ${post2.length}`);
    assert.ok(!post2.includes("…"), `${f.type} body was cut at its own limit`);
  }
});

test("bluesky.js uses buildPostTexts and no inline truncate", () => {
  const src = readFileSync(new URL("../bluesky.js", import.meta.url), "utf8");
  assert.ok(src.includes('import { buildPostTexts } from "./text.js"'));
  assert.ok(src.includes("buildPostTexts(ad)"));
  assert.ok(!src.includes("const truncate"));
});
