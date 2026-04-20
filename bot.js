import "dotenv/config";
import { generateAd } from "./generator.js";
import { postAd, deletePost } from "./bluesky.js";
import { addPost, getExpiredPosts, removePosts } from "./store.js";

const REQUIRED_ENV = ["ANTHROPIC_API_KEY", "BSKY_HANDLE", "BSKY_APP_PASSWORD"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const INTERVAL_HOURS = parseFloat(process.env.POST_INTERVAL_HOURS || "24");
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;
const MAX_AGE_DAYS = parseInt(process.env.POST_MAX_AGE_DAYS || "7");

async function cleanup() {
  const expired = getExpiredPosts(MAX_AGE_DAYS);
  if (!expired.length) return;
  console.log(`[${new Date().toISOString()}] Deleting ${expired.length} expired post(s)...`);
  for (const post of expired) {
    try {
      await deletePost(post.uri);
    } catch (err) {
      console.error(`Failed to delete ${post.uri}:`, err.message);
    }
  }
  removePosts(expired.map(p => p.uri));
}

async function run() {
  console.log(`[${new Date().toISOString()}] Generating ad...`);
  try {
    await cleanup();
    const ad = await generateAd();
    console.log(`Generated: ${ad.brandName} (${ad.format}) — ${ad.subjectA} + ${ad.subjectB}`);
    const uri = await postAd(ad);
    addPost(uri);
    console.log(`[${new Date().toISOString()}] Done.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
  }
}

run();
setInterval(run, INTERVAL_MS);

console.log(`Bot running. Posting every ${INTERVAL_HOURS}h. Posts expire after ${MAX_AGE_DAYS} days.`);