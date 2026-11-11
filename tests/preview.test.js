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
    subjectA: "SA", subjectB: "SB", imageQuery: "iq", retried: true,
    firstProblems: [{ field: "body", len: 190, max: 150 }],
    seed: { figure: "12 kg", stake: null, situation: "an incident", breakdown: "br" },
  });
  for (const s of ["[Yelp] Brand", "H", "B", "P", "A: SA | B: SB", "figure=12 kg", "incident=an incident", "retried: true", "first draft: body 190/150"]) {
    assert.ok(out.includes(s), `missing ${s}`);
  }
});

test("formatAd says when the first draft was within limits", () => {
  const out = formatAd({
    format: "Yelp", brandName: "B", headline: "H", body: "B", punchline: "P",
    subjectA: "SA", subjectB: "SB", imageQuery: "iq", retried: false, firstProblems: [],
    seed: { figure: "1 kg", stake: "a stake", situation: null, breakdown: "br" },
  });
  assert.ok(out.includes("first draft: within limits"));
});
