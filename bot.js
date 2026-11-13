import "dotenv/config";
import { generateAd } from "./generator.js";
import { postAd, deletePost, createSession } from "./bluesky.js";
import { addPost, getExpiredPosts, removePosts } from "./store.js";
import { cleanupExpired } from "./cleanup.js";

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
  let session = null;
  const { deleted, failed } = await cleanupExpired({
    getExpired: getExpiredPosts,
    remove: removePosts,
    del: async (uri) => deletePost(uri, (session ??= await createSession())),
    maxAgeDays: MAX_AGE_DAYS,
  });
  if (deleted.length || failed.length) {
    console.log(`[${new Date().toISOString()}] Expired posts: ${deleted.length} deleted, ${failed.length} failed.`);
  }
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