import test from "node:test";
import assert from "node:assert/strict";
import { parsePurgeArgs, selectOlder, runPurge } from "../scripts/purge.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-13T00:00:00Z");
const rec = (uri, daysAgo) => ({ uri, value: { createdAt: new Date(NOW - daysAgo * DAY).toISOString() } });
const quiet = { log: () => {}, error: () => {} };

test("parsePurgeArgs defaults to 7 days and dry run", () => {
  assert.deepEqual(parsePurgeArgs([]), { days: 7, apply: false });
  assert.deepEqual(parsePurgeArgs(["--older-than", "3", "--apply"]), { days: 3, apply: true });
  assert.throws(() => parsePurgeArgs(["--older-than", "abc"]), /number of days/);
});

test("selectOlder keeps only posts past the cutoff and skips records without dates", () => {
  const records = [rec("old", 10), rec("edge", 7.5), rec("new", 1), { uri: "nodate", value: {} }];
  assert.deepEqual(selectOlder(records, 7, NOW).map((r) => r.uri), ["old", "edge"]);
  assert.deepEqual(selectOlder(records, 0, NOW).map((r) => r.uri), ["old", "edge", "new"]);
});

test("dry run lists but deletes nothing", async () => {
  const dels = [];
  const out = await runPurge({
    listPosts: async () => [rec("a", 10), rec("b", 1)],
    del: async (u) => dels.push(u),
    remove: () => assert.fail("remove called on dry run"),
    days: 7, apply: false, now: NOW, log: quiet,
  });
  assert.equal(out.total, 2);
  assert.equal(out.selected, 1);
  assert.deepEqual(dels, []);
});

test("--apply deletes the old posts, keeps going after a failure and forgets only the deleted", async () => {
  const dels = [];
  const removed = [];
  const out = await runPurge({
    listPosts: async () => [rec("a", 10), rec("b", 20), rec("c", 30), rec("keep", 1)],
    del: async (u) => { dels.push(u); if (u === "b") throw new Error("nope"); },
    remove: (uris) => removed.push(...uris),
    days: 7, apply: true, now: NOW, log: quiet,
  });
  assert.deepEqual(dels, ["a", "b", "c"]);
  assert.deepEqual(out.deleted, ["a", "c"]);
  assert.equal(out.failed[0].uri, "b");
  assert.deepEqual(removed, ["a", "c"]);
});
