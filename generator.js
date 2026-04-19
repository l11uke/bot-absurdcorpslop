import fetch from "node-fetch";

const FORMATS = [
  { type: "Infomercial", hook: "Are you tired of...", voice: "desperate, breathless, assumes the listener is suffering" },
  { type: "Luxury brand", hook: "For those who understand...", voice: "quiet, assured, slightly contemptuous of people who need to be told" },
  { type: "Tech startup", hook: "We rebuilt X from the ground up", voice: "a solution looking for a problem, states the obvious without thinking objectively" },
  { type: "Government PSA", hook: "Did you know...", voice: "clear, concise, blame shifting to the reader" },
  { type: "Late night TV", hook: "But wait, there's more", voice: "begging you not to switch off" },
  { type: "Wellness brand", hook: "Your body deserves...", voice: "inventing medical issues you don't have, to seed dependence" },
  { type: "Financial product", hook: "Don't leave money on the table", voice: "get in early and you'll make money, don't miss out, hint at scarcity" },
  { type: "Political campaign", hook: "Did you know X received funding from Y, do not trust them in the election this year...", voice: "fear mongering and allude to others indirectly" },
  { type: "Legal disclaimer", hook: "A common side effect from X is suffering from the negative impacts associated with Y", voice: "your mileage may vary, we are not responsible" },
  { type: "Academic abstract", hook: "X is proven to increase the impact of Y on the environment", voice: "assertive, debate team nerd" },
  { type: "Dating profile", hook: "I'm a local X, looking for sexy Y in my county", voice: "cheesy and early 2000s language" },
  { type: "Real estate listing", hook: "The value of properties is sky rocketing if you have your own X", voice: "tacky and obvious, mutton dressed up as lamb" },
  { type: "Job posting", hook: "Are you an experienced X maintenance professional, looking for work in the Y industry?", voice: "genuine but oblivious" },
  { type: "Warning label", hook: "TOXIC - when taken X can be harmful to your Y", voice: "worst case scenario" },
  { type: "Obituary as ad", hook: "It is with great sadness that we need to advise X from the Y region has passed on", voice: "clickbait tragic" },
  { type: "TripAdvisor review", hook: "Five Stars! - we travelled with our X and the host at Y could not have been more accommodating", voice: "Karen style, but had a good experience, telling her friends about it" },
  { type: "LinkedIn thought leadership", hook: "Don't count your X before they Y - trust me, i turned a startup into a 500m ARR business", voice: "delusional confidence, humble-brag disguised as wisdom" },
  { type: "Kickstarter pitch", hook: "When you have all your X and they are out of control, you need a Y", voice: "nervous, but sure of themselves, self made bootstrap approach" },
  { type: "Supermarket bundle", hook: "Buy now and get an extra X when you buy Y", voice: "shouty, trying to confuse the fact these are commodity items on a race to the bottom" },
  { type: "Insurance claim", hook: "Following a recent incident...", voice: "factual but clearly telling one side of the story" },
  { type: "Classified ad", hook: "FOR SALE: One careful owner...", voice: "sleazy and untrustworthy, too good to be true" },
  { type: "Church bulletin", hook: "Join us this Sunday for...", voice: "earnest, thinks it is onto something, but the something is bland as can be" },
  { type: "Pyramid scheme", hook: "I wasn't sure at first, but...", voice: "product focused, obfuscates truth of the matter" },
  { type: "Caution label", hook: "CAUTION: May cause...", voice: "nested sentences with compounding structure, unnecessarily confusing" },
  { type: "Yelp review (unhinged)", hook: "I don't normally do this but...", voice: "grievance spiral, starts calm then deteriorates" },
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

  const prompt = `You are an advertising copywriter generating a fake advertisement.

You have been given two Wikipedia article subjects:
- Subject A: ${a.title} — ${a.summary}
- Subject B: ${b.title} — ${b.summary}

Ad format: ${format.type}
Tone of voice: ${format.voice}
Content hook: ${format.hook}

First, invent a fake brand name that combines or references both subjects. It should sound like a real brand — not a joke name, not a pun. Deadpan is funnier than obvious.

Then write the ad in three parts:
1. headline — one punchy sentence in the tone of the format
2. adCopy — 2-3 sentences of body copy that follow the headline
3. imageQuery — a 2-3 word Unsplash search term that would find a visually striking photo related to the subjects or brand. Should return real photos, not abstractions.

Rules:
- Never acknowledge the subjects are unrelated
- Write with complete sincerity — no winking at the audience
- The brand name should appear naturally in the copy
- Do not use the words: revolutionary, game-changing, innovative, unlock, leverage, seamlessly

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
  const parsed = JSON.parse(text);

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