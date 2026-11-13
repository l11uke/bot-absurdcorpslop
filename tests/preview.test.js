import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, formatAd } from "../scripts/preview.js";

test("parseArgs reads a format and the --incident flag", () => {
  assert.deepEqual(parseArgs([]), { formatType: undefined, forceSituation: false });
  assert.deepEqual(parseArgs(["Marketplace"]), { formatType: "Marketplace", forceSituation: false });
  assert.deepEqual(parseArgs(["Yelp", "--incident"]), { formatType: "Yelp", forceSituation: true });
});

test("formatAd shows the ad and its seeds", () => {
  const out = formatAd({
    format: "Yelp", brandName: "Brand", headline: "H", body: "B", punchline: "P",
    subjectA: "SA", subjectB: "SB", imageQuery: "iq", retried: true, repairs: 2,
    firstProblems: [{ field: "body", len: 190, max: 150 }, { field: "brandName", word: "alphonse" }],
    finalProblems: [],
    seed: { figure: "12 kg", stake: null, situation: "an incident", breakdown: "br", ending: "an offer withdrawn" },
  });
  for (const s of ["[Yelp] Brand", "H", "B", "P", "A: SA | B: SB", "figure=12 kg", "incident=an incident", "retried: true (repairs: 2)", "first draft: body 190/150, brandName has \"alphonse\"", "final: within limits", "ending: an offer withdrawn"]) {
    assert.ok(out.includes(s), `missing ${s}`);
  }
});

test("formatAd says when the first draft was within limits", () => {
  const out = formatAd({
    format: "Yelp", brandName: "B", headline: "H", body: "B", punchline: "P",
    subjectA: "SA", subjectB: "SB", imageQuery: "iq", retried: false, repairs: 0, firstProblems: [], finalProblems: [],
    seed: { figure: "1 kg", stake: "a stake", situation: null, breakdown: "br", ending: null },
  });
  assert.ok(out.includes("first draft: within limits"));
  assert.ok(out.includes("ending: free"));
});

test("formatAd shows redraws only when they happened", () => {
  const base = {
    format: "Yelp", brandName: "B", headline: "H", body: "B", punchline: "P",
    subjectA: "SA", subjectB: "SB", imageQuery: "iq", retried: false, repairs: 0,
    firstProblems: [], finalProblems: [],
    seed: { figure: "1 kg", stake: "s", situation: null, breakdown: "br", ending: null },
  };
  assert.ok(!formatAd({ ...base, redrawn: 0, skippedTitles: [] }).includes("redrawn"));
  const out = formatAd({ ...base, redrawn: 2, skippedTitles: ["X", "Y"] });
  assert.ok(out.includes("redrawn: 2 (skipped: X; Y)"));
});
