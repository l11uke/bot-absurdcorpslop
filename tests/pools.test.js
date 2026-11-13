import test from "node:test";
import assert from "node:assert/strict";
import {
  FORMATS, CONCEPTS, OBJECTS, STAKES, BREAKDOWNS, COUNT_UNITS, MEASURE_UNITS,
  SITUATIONS, OBJECT_SHARE, ENDINGS, ENDING_SHARE, DEFAULT_WORDS, FORMAT_WORDS, FORMAT_NOTES, SENSITIVE_STEMS, SENSITIVE_WORDS,
} from "../pools.js";

const unique = (list) => new Set(list).size === list.length;
const BRANDS = /Facebook|Google|Gumtree|eBay|Amazon|Netflix|Uber|Bunnings|Woolworths|Coles|IKEA/i;

test("pool sizes", () => {
  assert.ok(CONCEPTS.length >= 300, `concepts ${CONCEPTS.length}`);
  assert.ok(OBJECTS.length >= 150, `objects ${OBJECTS.length}`);
  assert.ok(STAKES.length >= 50, `stakes ${STAKES.length}`);
  assert.ok(BREAKDOWNS.length >= 12, `breakdowns ${BREAKDOWNS.length}`);
  assert.ok(COUNT_UNITS.length >= 10 && MEASURE_UNITS.length >= 5);
});

test("every pool is unique and non-empty", () => {
  for (const [name, list] of Object.entries({ CONCEPTS, OBJECTS, STAKES, BREAKDOWNS, COUNT_UNITS, MEASURE_UNITS, ENDINGS })) {
    assert.ok(unique(list), `duplicates in ${name}`);
    for (const x of list) assert.ok(typeof x === "string" && x.trim().length > 0, `${name} blank`);
  }
});

test("no stake mentions spouses or brands", () => {
  for (const s of STAKES) {
    assert.ok(!/spouse|wife|husband|marriage|partner/i.test(s), `spouse stake: ${s}`);
    assert.ok(!BRANDS.test(s), `brand in stake: ${s}`);
  }
});

test("no brand names in objects, concepts or situations", () => {
  const all = [...OBJECTS, ...CONCEPTS, ...Object.values(SITUATIONS).flatMap((s) => s.items)];
  for (const x of all) assert.ok(!BRANDS.test(x), `brand: ${x}`);
});

test("Marketplace is a format and situations are valid", () => {
  assert.ok(FORMATS.some((f) => f.type === "Marketplace"));
  const types = new Set(FORMATS.map((f) => f.type));
  for (const [k, v] of Object.entries(SITUATIONS)) {
    assert.ok(types.has(k), `situation for unknown format ${k}`);
    assert.ok(v.chance > 0 && v.chance <= 1);
    assert.ok(v.items.length >= 2);
    for (const item of v.items) assert.ok(item.includes("{B}"), `no {B}: ${item}`);
  }
  assert.equal(SITUATIONS.Marketplace.chance, 1);
  assert.ok(SITUATIONS.Marketplace.items.length >= 8);
  assert.ok(SITUATIONS.Yelp.chance > 0 && SITUATIONS.Yelp.chance < 1);
});

test("object share is a sane fraction", () => {
  assert.ok(OBJECT_SHARE > 0 && OBJECT_SHARE < 1);
});

test("endings pool is large, unique and never asks a question", () => {
  assert.ok(ENDINGS.length >= 12, `endings ${ENDINGS.length}`);
  for (const e of ENDINGS) assert.ok(!e.includes("?"), `question ending: ${e}`);
  assert.ok(ENDING_SHARE > 0 && ENDING_SHARE <= 1);
});

test("word budgets exist for every default field and Marketplace thread fits", () => {
  for (const k of ["headline", "body", "punchline"]) assert.ok(DEFAULT_WORDS[k] > 0);
  assert.ok(FORMAT_WORDS.Marketplace.body >= 27);
  assert.ok(FORMAT_NOTES.Marketplace.includes("three messages"));
});

test("sensitive lists are lowercase, unique and non-trivial", () => {
  assert.ok(SENSITIVE_STEMS.length >= 40 && SENSITIVE_WORDS.length >= 3);
  assert.ok(unique(SENSITIVE_STEMS) && unique(SENSITIVE_WORDS));
  for (const t of [...SENSITIVE_STEMS, ...SENSITIVE_WORDS]) assert.equal(t, t.toLowerCase());
});

test("exactly one breakdown carries the {time} placeholder", () => {
  assert.equal(BREAKDOWNS.filter((b) => b.includes("{time}")).length, 1);
});
