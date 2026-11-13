import "dotenv/config";
import fetch from "node-fetch";
import { execSync } from "child_process";
import {
  FORMATS, CONCEPTS, OBJECTS, STAKES, BREAKDOWNS,
  COUNT_UNITS, MEASURE_UNITS, OBJECT_SHARE, SITUATIONS,
  DEFAULT_LIMITS, FORMAT_LIMITS, DEFAULT_WORDS, FORMAT_WORDS, FORMAT_NOTES,
  ENDINGS, ENDING_SHARE, SENSITIVE_STEMS, SENSITIVE_WORDS,
} from "./pools.js";

export { FORMATS, CONCEPTS };

const MODEL = "claude-haiku-4-5-20251001";
export const MAX_REPAIRS = 2;
export const LIMITS = DEFAULT_LIMITS;

export function limitsFor(formatType) {
  return { ...DEFAULT_LIMITS, ...(FORMAT_LIMITS[formatType] || {}) };
}

export function wordsFor(formatType) {
  return { ...DEFAULT_WORDS, ...(FORMAT_WORDS[formatType] || {}) };
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

export function randomTime(rng = Math.random) {
  const hour = 1 + Math.floor(rng() * 12);
  let minute;
  do {
    minute = 1 + Math.floor(rng() * 59);
  } while (minute === 47 || minute % 5 === 0);
  return `${hour}:${String(minute).padStart(2, "0")} ${rng() < 0.5 ? "AM" : "PM"}`;
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
    breakdown: pick(BREAKDOWNS, rng).replaceAll("{time}", randomTime(rng)),
    ending: rng() < ENDING_SHARE ? pick(ENDINGS, rng) : null,
  };
}

export function buildPrompt(seed) {
  const { format, wiki, subjectB, situation, stake, figure, breakdown, ending } = seed;
  const words = wordsFor(format.type);
  const note = FORMAT_NOTES[format.type];
  const seeds = [
    `- Number to use: ${figure}. It must appear in the body or punchline exactly as written.`,
    situation
      ? `- Incident: ${situation} The headline or the first sentence must state this incident literally, so a reader understands the premise at once.`
      : `- Stake: the whole dispute is about ${stake}.`,
    `- Breakdown shape (use loosely): ${breakdown}.`,
    ending
      ? `- Punchline shape: ${ending}. The punchline is a statement, never a question and never a request.`
      : null,
  ].filter(Boolean).join("\n");

  return `You are a sincere customer, employee, or business owner writing in the "${format.type}" format. You have been given two unrelated subjects. In your world they are connected, and you have been living inside that connection for some time.

Subject A (from Wikipedia): ${wiki.title} — ${wiki.summary}
Subject B (a concept or object): ${subjectB}

Format: ${format.type}
Format voice: ${format.voice}
Format hook: ${format.hook}${note ? `\nFormat structure: ${note}` : ""}

SEEDS (these are fixed, build the piece around them):
${seeds}

BRAND NAME:
Invent a brand name that is obviously wrong. It should sound like both subjects went through a name generator unchecked. Confidently incorrect, no puns. Never put place names, titles of films, books or songs, or personal names from Subject A in the brand name, and never reuse a word from Subject A's title.

THE ARC (applies to every format):
- headline: opens fully in the format voice and sounds normal for about one clause
- body: composure slips. A personal situation appears. The narrator treats it as routine.
- punchline: total breakdown. The narrator is far past the point of reason and still polite.

RULES:
- Include at least one specific detail from Subject A and make Subject B load-bearing in the situation
- Do not make a spouse or marriage the source of the problem
- Never acknowledge the subjects are unrelated
- Never use real names of living or historical people from Subject A. Refer to them by role or category.
- Never use real business names from Subject A. Refer to them by type only.
- Never name real platforms or brands. Refer to them by type only.
- No street addresses, phone numbers or email addresses. Keep private homes and streets fictional and unnamed.
- Do not use the words: revolutionary, game-changing, innovative, unlock, leverage, seamlessly

OUTPUT (short beats long, count your words):
1. headline — one sentence. Max ${words.headline} words.
2. body — Max ${words.body} words.
3. punchline — the final sentence. Max ${words.punchline} words. This line must survive intact.
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

const SUMMARY_SKIP = new Set(["Although", "Because", "However", "Between", "Another", "Several", "Through"]);

export function forbiddenBrandWords(wiki) {
  const words = new Set();
  for (const w of (wiki.title || "").split(/[^\p{L}]+/u)) {
    if (w.length >= 4) words.add(w.toLowerCase());
  }
  for (const w of (wiki.summary || "").match(/\b\p{Lu}\p{L}{5,}\b/gu) || []) {
    if (!SUMMARY_SKIP.has(w)) words.add(w.toLowerCase());
  }
  return [...words];
}

export function brandProblems(ad, wiki) {
  const brand = ad.brandName.toLowerCase();
  return forbiddenBrandWords(wiki)
    .filter((w) => brand.includes(w))
    .map((word) => ({ field: "brandName", word }));
}

export function adProblems(ad, seed) {
  return [
    ...lengthProblems(ad, limitsFor(seed.format.type)),
    ...brandProblems(ad, seed.wiki),
  ];
}

export function describeProblem(p, words) {
  if (p.word) {
    return `brandName contains "${p.word}" from Subject A, so invent a brand name without it`;
  }
  return `${p.field} is ${p.len} characters (max ${p.max}, about ${words[p.field]} words)`;
}

export const WIKI_USER_AGENT = "bot-absurdcorpslop/1.0 (https://github.com/l11uke/bot-absurdcorpslop)";
const WIKI_URL = "https://en.wikipedia.org/api/rest_v1/page/random/summary";

function runCurl() {
  return execSync(
    `curl -sL --max-time 10 -A "${WIKI_USER_AGENT}" "${WIKI_URL}"`,
    { encoding: "utf8" }
  );
}

function sleepSync(seconds) {
  execSync(`sleep ${seconds}`);
}

export function parseWikiResponse(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Wikipedia returned a non-JSON response: ${String(raw).trim().slice(0, 80)}`);
  }
  if (!data || !data.title) throw new Error("Wikipedia response had no title");
  return {
    title: data.title,
    summary: data.extract ? data.extract.slice(0, 300) : "",
  };
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SENSITIVE_RE = new RegExp(
  `\\b(?:${SENSITIVE_STEMS.map(escapeRe).join("|")})|\\b(?:${SENSITIVE_WORDS.map(escapeRe).join("|")})\\b`,
  "i"
);

export function isSensitive(wiki) {
  return SENSITIVE_RE.test(`${wiki.title} ${wiki.summary}`);
}

export const MAX_WIKI_DRAWS = 5;

export function drawSafeWiki({
  wikiImpl = getWikiArticle,
  pause = () => sleepSync(1),
  maxDraws = MAX_WIKI_DRAWS,
} = {}) {
  const skipped = [];
  for (let i = 0; i < maxDraws; i++) {
    const wiki = wikiImpl();
    if (!isSensitive(wiki)) return { wiki, skipped };
    skipped.push(wiki.title);
    if (i < maxDraws - 1) pause();
  }
  throw new Error(`No suitable Wikipedia article after ${maxDraws} draws (skipped: ${skipped.join("; ")})`);
}

export function getWikiArticle({ curl = runCurl, sleep = sleepSync, retryDelaySeconds = 3 } = {}) {
  try {
    return parseWikiResponse(curl());
  } catch (firstErr) {
    sleep(retryDelaySeconds);
    try {
      return parseWikiResponse(curl());
    } catch (secondErr) {
      throw new Error(`Wikipedia fetch failed twice: ${secondErr.message}`);
    }
  }
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
  pause,
  rng = Math.random,
  formatType,
  forceSituation = false,
} = {}) {
  const { wiki, skipped } = drawSafeWiki({ wikiImpl, ...(pause ? { pause } : {}) });
  const seed = drawSeed(wiki, rng, { formatType, forceSituation });
  const words = wordsFor(seed.format.type);
  const messages = [{ role: "user", content: buildPrompt(seed) }];

  let text = await askClaude(messages, fetchImpl);
  let ad = parseAdResponse(text);
  const firstProblems = adProblems(ad, seed);
  let problems = firstProblems;
  let repairs = 0;

  while (problems.length && repairs < MAX_REPAIRS) {
    repairs++;
    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content: `Fix this: ${problems.map((p) => describeProblem(p, words)).join("; ")}. Keep the same idea, write shorter, and stay inside every limit. Return ONLY the JSON.`,
    });
    try {
      const nextText = await askClaude(messages, fetchImpl);
      ad = parseAdResponse(nextText);
      text = nextText;
      problems = adProblems(ad, seed);
    } catch (err) {
      if (/Anthropic API error/.test(err.message)) throw err;
      break; // repair unusable: keep the last good result
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
      ending: seed.ending,
      bIsObject: seed.bIsObject,
    },
    redrawn: skipped.length,
    skippedTitles: skipped,
    retried: repairs > 0,
    repairs,
    firstProblems,
    finalProblems: problems,
  };
}
