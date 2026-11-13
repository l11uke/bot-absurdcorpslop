// Pure text helpers for building Bluesky posts. No network, no env.

export const POST_MAX = 300;
export const TAGS = "#satire #absurdcorpslop";

const SENTENCE_END = /[.!?]["')\]]?(?=\s|$)/g;

export function truncateAtSentence(str, max) {
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  let end = -1;
  for (const m of cut.matchAll(SENTENCE_END)) end = m.index + m[0].length;
  if (end >= Math.floor(max * 0.4)) return cut.slice(0, end).trimEnd();
  const space = cut.lastIndexOf(" ", max - 1);
  const base = space > 0 ? cut.slice(0, space) : cut.slice(0, max - 1);
  return base.trimEnd().replace(/[,;:\-–—]$/, "") + "…";
}

export function buildPostTexts(ad) {
  const header = `[${ad.format.toUpperCase()}]\n${ad.brandName}\n`;
  const footer = `\n${TAGS}`;
  const headline = truncateAtSentence(ad.headline, POST_MAX - header.length - footer.length);
  const punchline = `\n${ad.punchline}`;
  const body = truncateAtSentence(ad.body, POST_MAX - punchline.length);
  return {
    post1: `${header}${headline}${footer}`,
    post2: `${body}${punchline}`,
  };
}
