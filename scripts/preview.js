import { generateAd } from "../generator.js";
import { pathToFileURL } from "node:url";

export function parseArgs(argv) {
  const opts = { formatType: undefined, forceSituation: false };
  for (const a of argv) {
    if (a === "--incident") opts.forceSituation = true;
    else if (!a.startsWith("--")) opts.formatType = a;
  }
  return opts;
}

function describe(problems) {
  if (!problems || !problems.length) return "within limits";
  return problems.map((p) => (p.word ? `brandName has "${p.word}"` : `${p.field} ${p.len}/${p.max}`)).join(", ");
}

export function formatAd(ad) {
  const s = ad.seed;
  return [
    `[${ad.format}] ${ad.brandName}`,
    ad.headline,
    ad.body,
    ad.punchline,
    "",
    `A: ${ad.subjectA} | B: ${ad.subjectB}`,
    ad.redrawn ? `redrawn: ${ad.redrawn} (skipped: ${ad.skippedTitles.join("; ")})` : null,
    `seed: figure=${s.figure} | ${s.situation ? "incident=" + s.situation : "stake=" + s.stake}`,
    `breakdown: ${s.breakdown}`,
    `ending: ${s.ending || "free"}`,
    `retried: ${ad.retried} (repairs: ${ad.repairs ?? 0}) | image: ${ad.imageQuery}`,
    `first draft: ${describe(ad.firstProblems)}`,
    `final: ${describe(ad.finalProblems)}`,
  ].filter((l) => l !== null).join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ad = await generateAd(parseArgs(process.argv.slice(2)));
  console.log(formatAd(ad));
}
