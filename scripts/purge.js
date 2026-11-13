import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createSession, listOwnPosts, deletePost } from "../bluesky.js";
import { removePosts } from "../store.js";

export function parsePurgeArgs(argv) {
  const opts = { days: 7, apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--apply") opts.apply = true;
    else if (argv[i] === "--older-than") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 0) throw new Error("--older-than needs a number of days");
      opts.days = n;
    }
  }
  return opts;
}

export function selectOlder(records, days, now = Date.now()) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return records.filter((r) => {
    const t = Date.parse(r.value && r.value.createdAt);
    return Number.isFinite(t) && t < cutoff;
  });
}

export async function runPurge({ listPosts, del, remove, days, apply, now = Date.now(), log = console }) {
  const all = await listPosts();
  const old = selectOlder(all, days, now);
  const result = { total: all.length, selected: old.length, deleted: [], failed: [] };
  log.log(`${all.length} posts on the account, ${old.length} older than ${days} day(s).`);
  if (!apply) {
    log.log("Dry run. Nothing deleted. Add --apply to delete.");
    return result;
  }
  for (const r of old) {
    try {
      await del(r.uri);
      result.deleted.push(r.uri);
    } catch (err) {
      result.failed.push({ uri: r.uri, error: err.message });
      log.error(`Failed: ${r.uri}: ${err.message}`);
    }
  }
  if (result.deleted.length) remove(result.deleted);
  log.log(`Deleted ${result.deleted.length}, failed ${result.failed.length}.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parsePurgeArgs(process.argv.slice(2));
  const session = await createSession();
  await runPurge({
    listPosts: () => listOwnPosts(session),
    del: (uri) => deletePost(uri, session),
    remove: removePosts,
    ...opts,
  });
}
