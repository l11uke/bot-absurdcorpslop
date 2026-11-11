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

export function formatAd(ad) {
  const s = ad.seed;
  return [
    `[${ad.format}] ${ad.brandName}`,
    ad.headline,
    ad.body,
    ad.punchline,
    "",
    `A: ${ad.subjectA} | B: ${ad.subjectB}`,
    `seed: figure=${s.figure} | ${s.situation ? "incident=" + s.situation : "stake=" + s.stake}`,
    `breakdown: ${s.breakdown}`,
    `retried: ${ad.retried} | image: ${ad.imageQuery}`,
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ad = await generateAd(parseArgs(process.argv.slice(2)));
  console.log(formatAd(ad));
}
