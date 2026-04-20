import "dotenv/config";
import fetch from "node-fetch";

const FORMATS = [
  { type: "Infomercial", hook: "Are you tired of...", voice: "desperate, breathless, assumes the listener is suffering" },
  { type: "Luxury", hook: "For those who understand...", voice: "quiet, assured, slightly contemptuous of people who need to be told" },
  { type: "Tech Startup", hook: "We rebuilt X from the ground up", voice: "a solution looking for a problem, states the obvious without thinking objectively" },
  { type: "Gov PSA", hook: "Did you know...", voice: "clear, concise, blame shifting to the reader" },
  { type: "Late Night TV", hook: "But wait, there's more", voice: "begging you not to switch off" },
  { type: "Wellness", hook: "Your body deserves...", voice: "inventing medical issues you don't have, to seed dependence" },
  { type: "Financial", hook: "Don't leave money on the table", voice: "get in early and you'll make money, don't miss out, hint at scarcity" },
      { type: "Real Estate", hook: "The value of properties is sky rocketing if you have your own X", voice: "tacky and obvious, mutton dressed up as lamb" },
  { type: "Job Posting", hook: "Are you an experienced X maintenance professional, looking for work in the Y industry?", voice: "genuine but oblivious" },
      { type: "LinkedIn", hook: "Don't count your X before they Y - trust me, i turned a startup into a 500m ARR business", voice: "delusional confidence, humble-brag disguised as wisdom" },
  { type: "Kickstarter", hook: "When you have all your X and they are out of control, you need a Y", voice: "nervous, but sure of themselves, self made bootstrap approach" },
  { type: "Supermarket", hook: "Buy now and get an extra X when you buy Y", voice: "shouty, trying to confuse the fact these are commodity items on a race to the bottom" },
    { type: "Classified", hook: "FOR SALE: One careful owner...", voice: "sleazy and untrustworthy, too good to be true" },
    { type: "Pyramid Scheme", hook: "I wasn't sure at first, but...", voice: "product focused, obfuscates truth of the matter" },
    { type: "Yelp", hook: "I don't normally do this but...", voice: "grievance spiral, starts calm then deteriorates" },
];

async function getWikiArticle() {
  const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary");
  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);
  const data = await res.json();
  return {
    title: data.title,
    summary: data.extract ? data.extract.slice(0, 300) : "",
  };
}

export async function generateAd() {
  const [a, b] = await Promise.all([getWikiArticle(), getWikiArticle()]);
  const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];

  const prompt = `You are a deranged advertising copywriter who has been given two completely unrelated Wikipedia subjects and must produce a fake advertisement that treats their combination as completely normal.

You have been given two Wikipedia article subjects:
- Subject A: ${a.title} — ${a.summary}
- Subject B: ${b.title} — ${b.summary}

Ad format: ${format.type}
Tone of voice: ${format.voice}
Content hook: ${format.hook}

BRAND NAME:
Invent a fake brand name that is obviously wrong — it should sound like someone fed both subjects into a name generator and hit enter without checking. Not a pun. Not a joke. Just confidently incorrect. Like a company that should not exist.

COPY RULES:
- You must include at least one specific factual detail from EACH Wikipedia subject, used completely out of context but stated with total conviction
- The ad must go somewhere unexpected — start in format, then let the combination pull it somewhere it shouldn't go
- Never acknowledge the subjects are unrelated
- Write with the unhinged sincerity of someone who sees no problem here whatsoever
- The brand name should appear naturally in the copy
- Do not use the words: revolutionary, game-changing, innovative, unlock, leverage, seamlessly
- adCopy must be under 220 characters. Front-load the most specific and wrong detail first — the last sentence is the one that gets cut.

OUTPUT:
1. headline — one punchy sentence in the tone of the format
2. adCopy — 2-3 sentences. Start in format voice, let it drift.
3. imageQuery — a 2-3 word Unsplash search term for a visually striking real photo related to the subjects

Return ONLY valid JSON, no markdown, no backticks:
{"brandName": "...", "headline": "...", "adCopy": "...", "imageQuery": "..."}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text.trim();
  const clean = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
  const parsed = JSON.parse(clean);

  return {
    brandName: parsed.brandName,
    headline: parsed.headline,
    adCopy: parsed.adCopy,
    imageQuery: parsed.imageQuery,
    format: format.type,
    subjectA: a.title,
    subjectB: b.title,
  };
}