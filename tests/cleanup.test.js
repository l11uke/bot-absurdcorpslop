import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanupExpired } from "../cleanup.js";

const quiet = { error: () => {} };

function harness({ expired, failOn = [] }) {
  const calls = { del: [], remove: [] };
  return {
    calls,
    args: {
      getExpired: () => expired.map((uri) => ({ uri })),
      remove: (uris) => calls.remove.push(uris),
      del: async (uri) => {
        calls.del.push(uri);
        if (failOn.includes(uri)) throw new Error("boom");
      },
      maxAgeDays: 7,
      log: quiet,
    },
  };
}

test("all deletions succeed: every post is forgotten", async () => {
  const h = harness({ expired: ["a", "b"] });
  const out = await cleanupExpired(h.args);
  assert.deepEqual(out.deleted, ["a", "b"]);
  assert.deepEqual(h.calls.remove, [["a", "b"]]);
});

test("a failed deletion stays in the store so it is retried next run", async () => {
  const h = harness({ expired: ["a", "b", "c"], failOn: ["b"] });
  const out = await cleanupExpired(h.args);
  assert.deepEqual(out.deleted, ["a", "c"]);
  assert.equal(out.failed.length, 1);
  assert.equal(out.failed[0].uri, "b");
  assert.deepEqual(h.calls.remove, [["a", "c"]]);
  assert.deepEqual(h.calls.del, ["a", "b", "c"], "did not continue after a failure");
});

test("when every deletion fails nothing is removed from the store", async () => {
  const h = harness({ expired: ["a", "b"], failOn: ["a", "b"] });
  const out = await cleanupExpired(h.args);
  assert.equal(out.deleted.length, 0);
  assert.deepEqual(h.calls.remove, []);
});

test("nothing expired means no calls", async () => {
  const h = harness({ expired: [] });
  const out = await cleanupExpired(h.args);
  assert.deepEqual(out, { deleted: [], failed: [] });
  assert.deepEqual(h.calls.del, []);
  assert.deepEqual(h.calls.remove, []);
});

test("failures are logged with the URI and the reason", async () => {
  const lines = [];
  const h = harness({ expired: ["at://x/y/z"], failOn: ["at://x/y/z"] });
  await cleanupExpired({ ...h.args, log: { error: (m) => lines.push(m) } });
  assert.ok(lines[0].includes("at://x/y/z") && lines[0].includes("boom"));
});

test("bot.js uses cleanupExpired and shares one session across deletions", () => {
  const src = readFileSync(new URL("../bot.js", import.meta.url), "utf8");
  assert.ok(src.includes("cleanupExpired("));
  assert.ok(src.includes("session ??= await createSession()"));
  assert.ok(!src.includes("removePosts(expired.map"), "old unconditional removal is back");
});
