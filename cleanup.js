// Deletes expired posts and forgets only the ones that were really deleted.
export async function cleanupExpired({
  getExpired,
  remove,
  del,
  maxAgeDays,
  log = console,
}) {
  const expired = getExpired(maxAgeDays);
  const deleted = [];
  const failed = [];
  for (const post of expired) {
    try {
      await del(post.uri);
      deleted.push(post.uri);
    } catch (err) {
      failed.push({ uri: post.uri, error: err.message });
      log.error(`Failed to delete ${post.uri}: ${err.message}`);
    }
  }
  if (deleted.length) remove(deleted);
  return { deleted, failed };
}
