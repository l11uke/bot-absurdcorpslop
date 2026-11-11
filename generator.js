import "dotenv/config";
import fetch from "node-fetch";
import { execSync } from "child_process";
import {
  FORMATS, CONCEPTS, OBJECTS, STAKES, BREAKDOWNS,
  COUNT_UNITS, MEASURE_UNITS, OBJECT_SHARE, SITUATIONS,
  DEFAULT_LIMITS, FORMAT_LIMITS, FORMAT_NOTES,
} from "./pools.js";

export { FORMATS, CONCEPTS };

const MODEL = "claude-haiku-4-5-20251001";
export const LIMITS = DEFAULT_LIMITS;

export function limitsFor(formatType) {
  return { ...DEFAULT_LIMITS, ...(FORMAT_LIMITS[formatType] || {}) };
}

export function pick(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

const AVOID_NUMBERS = new Set([19, 47]);

export function randomFigure(rng = Math.random) {
  const roll = rng();
  if (roll < 0.6) {
    let n;
    do {
      n = 3 + Math.floor(rng() * 997);
    } while (n % 10 === 0 || AVOID_NUMBERS.has(n));
    return `${n} ${pick(COUNT_UNITS, rng)}`;
  }
  if (roll < 0.85) {
    const dollars = 2 + Math.floor(rng() * 498);
    const cents = Math.floor(rng() * 100);
    return `$${dollars}.${String(cents).padStart(2, "0")}`;
  }
  const whole = 1 + Math.floor(rng() * 98);
  const tenth = 1 + Math.floor(rng() * 9);
  return `${whole}.${tenth} ${pick(MEASURE_UNITS, rng)}`;
}

export function drawSeed(wiki, rng = Math.random, opts = {}) {
  const { formatType, forceSituation = false } = opts;
  const format = formatType
    ? FORMATS.find((f) => f.type === formatType)
    : pick(FORMATS, rng);
  if (!format) throw new Error(`Unknown format: ${formatType}`);

  const bIsObject = rng() < OBJECT_SHARE;
  const subjectB = bIsObject ? pick(OBJECTS, rng) : pick(CONCEPTS, rng);

  let situation = null;
  const sit = SITUATIONS[format.type];
  if (sit && (forceSituation || rng() < sit.chance)) {
    situation = pick(sit.items, rng).replaceAll("{B}", subjectB);
  }

  return {
    format,
    wiki,
    subjectB,
    bIsObject,
    situation,
    stake: situation ? null : pick(STAKES, rng),
    figure: randomFigure(rng),
    breakdown: pick(BREAKDOWNS, rng),
  };
}

export function buildPrompt(seed) {
  const { format, wiki, subjectB, situation, stake, figure, breakdown } = seed;
  const limits = limitsFor(format.type);
  const note = FORMAT_NOTES[format.type];
  const seeds = [
    `- Number to use: ${figure}. It must appear in the body or punchline exactly as written.`,
    situation
      ? `- Incident: ${situation} The headline or the first sentence must state this incident literally, so a reader understands the premise at once.`
      :  `- Stake: the whole dispute is about ${stake}.`,
    `- Breakdown shape (use loosely): ${breakdown}.`,
  ].join("\n");

  return `You are a sincere customer, employee, or business owner writing in the "${format.type}" format. You have been given two unrelated subjects. In your world they are connected, and you have been living inside that connection for some time.

Subject A (from Wikipedia): ${wiki.title} — ${wiki.summary}
Subject B (a concept or object): ${subjectB}

Format: ${format.type}
Format voice: ${format.voice}
Format hook: ${format.hook}${note ? `\nFormat structure: ${note}` : ""}

SEEDS (these are fixed, build the piece around them):
${seeds}

BRAND NAME:
Invent a brand name that is obviously wrong. It should sound like both subjects went through a name generator unchecked. Confidently incorrect, no puns. Never put place names, titles of films, books or songs, or personal names from Subject A in the brand name.

THE ARC (applies to every format):
- headline: opens fully in the format voice and sounds normal for about one clause
- body: composure slips. A personal situation appears. The narrator treats it as routine.
- punchline: total breakdown. The narrator is far past the point of reason, still polite, and ends with a small practical request that shows how bad things have become.

RULES:
- Include at least one specific detail from Subject A and make Subject B load-bearing in the situation
- Do not make a spouse or marriage the source of the problem
- Never acknowledge the subjects are unrelated
- Never use real names of living or historical people from Subject A. Refer to them by role or category.
- Never use real business names from Subject A. Refer to them by type only.
- Never name real platforms or brands. Refer to them by type only.
- No street addresses, phone numbers or email addresses. Keep private homes and streets fictional and unnamed.
- Do not use the words: revolutionary, game-changing, innovative, unlock, leverage, seamlessly

OUTPUT:
1. headline — one sentence. Max ${limits.headline} characters.
2. body — 1-2 sentences. Max ${limits.body} characters.
3. punchline — the final sentence. Max ${limits.punchline} characters. This line must survive intact.
4. imageQuery — a 2-3 word Unsplash search term for a visually striking real photo

Return ONLY valid JSON, no markdown, no backticks:
{"brandName": "...", "headline": "...", "body": "...", "punchline": "...", "imageQuery": "..."}`;
}

const REQUIRED_FIELDS = ["brandName", "headline", "body", "punchline", "imageQuery"];

export function parseAdResponse(text) {
  const clean = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
  const parsed = JSON.parse(clean);
  const missing = REQUIRED_FIELDS.filter(
    (k) => typeof parsed[k] !== "string" || !parsed[k].trim()
  );
  if (missing.length) {
    throw new Error(`Model response missing fields: ${missing.join(", ")}`);
  }
  return parsed;
}

export function lengthProblems(ad, limits = DEFAULT_LIMITS) {
  const out = [];
  for (const [field, max] of Object.entries(limits)) {
    const len = [...ad[field]].length;
    if (len > max) out.push({ field, len, max });
  }
  return out;
}

export function getWikiArticle() {
  const result = execSync(
    'curl -sL --max-time 10 "https://en.wikipedia.org/api/rest_v1/page/random/summary"',
    { encoding: "utf8" }
  );
  const data = JSON.parse(result);
  return {
    title: data.title,
    summary: data.extract ? data.extract.slice(0, 300) : "",
  };
}

async function askClaude(messages, fetchImpl) {
  const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

export async function generateAd({
  fetchImpl = fetch,
  wikiImpl = getWikiArticle,
  rng = Math.random,
  formatType,
  forceSituation = false,
} = {}) {
  const wiki = wikiImpl();
  const seed = drawSeed(wiki, rng, { formatType, forceSituation });
  const messages = [{ role: "user", content: buildPrompt(seed) }];

  const firstText = await askClaude(messages, fetchImpl);
  let ad = parseAdResponse(firstText);
  let retried = false;

  const problems = lengthProblems(ad, limitsFor(seed.format.type));
  const firstProblems = problems;
  if (problems.length) {
    retried = true;
    const detail = problems
      .map((p) => `${p.field} is ${p.len} characters (max ${p.max})`)
      .join("; ");
    messages.push({ role: "assistant", content: firstText });
    messages.push({
      role: "user",
      content: `Too long: ${detail}. Rewrite it with the same idea and every field inside its limit. Return ONLY the JSON.`,
    });
    try {
      ad = parseAdResponse(await askClaude(messages, fetchImpl));
    } catch (err) {
      // retry unusable: keep the first result
    }
  }

  return {
    brandName: ad.brandName,
    headline: ad.headline,
    body: ad.body,
    punchline: ad.punchline,
    imageQuery: ad.imageQuery,
    format: seed.format.type,
    subjectA: wiki.title,
    subjectB: seed.subjectB,
    seed: {
      figure: seed.figure,
      stake: seed.stake,
      situation: seed.situation,
      breakdown: seed.breakdown,
      bIsObject: seed.bIsObject,
    },
    retried,
    firstProblems,
  };
}
