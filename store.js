import { readFileSync, writeFileSync, existsSync } from "fs";

const STORE_PATH = "./posts.json";

function load() {
  if (!existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function save(posts) {
  writeFileSync(STORE_PATH, JSON.stringify(posts, null, 2));
}

export function addPost(uri) {
  const posts = load();
  posts.push({ uri, postedAt: new Date().toISOString() });
  save(posts);
}

export function getExpiredPosts(maxAgeDays) {
  const posts = load();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return posts.filter(p => new Date(p.postedAt).getTime() < cutoff);
}

export function removePosts(uris) {
  const posts = load();
  const remaining = posts.filter(p => !uris.includes(p.uri));
  save(remaining);
}