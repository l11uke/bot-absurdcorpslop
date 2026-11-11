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
    seed: { figure: "12 kg", stake: null, situation: "an incident", breakdown: "br" },
  });
  for (const s of ["[Yelp] Brand", "H", "B", "P", "A: SA | B: SB", "figure=12 kg", "incident=an incident", "retried: true"]) {
    assert.ok(out.includes(s), `missing ${s}`);
  }
});
