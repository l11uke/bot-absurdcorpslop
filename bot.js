import "dotenv/config";
import { generateAd } from "./generator.js";
import { postAd } from "./bluesky.js";

// Validate required env vars at startup
const REQUIRED_ENV = ["ANTHROPIC_API_KEY", "BSKY_HANDLE", "BSKY_APP_PASSWORD"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// How often to post. Default: once every 24 hours.
// Override with POST_INTERVAL_HOURS env var.
const INTERVAL_HOURS = parseFloat(process.env.POST_INTERVAL_HOURS || "24");
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

async function run() {
  console.log(`[${new Date().toISOString()}] Generating ad...`);
  try {
    const ad = await generateAd();
    console.log(`Generated: ${ad.brandName} (${ad.format}) — ${ad.subjectA} + ${ad.subjectB}`);
    await postAd(ad);
    console.log(`[${new Date().toISOString()}] Done.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
  }
}

// Post immediately on startup, then on the interval
run();
setInterval(run, INTERVAL_MS);

console.log(`Bot running. Posting every ${INTERVAL_HOURS}h.`);