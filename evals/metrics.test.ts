import { expect, it } from "vitest";
import {
  interval,
  leakMacro,
  leakMicro,
  overMasking,
  pairedInterval,
} from "./metrics";
import type { CaseScore } from "./score";

function score(id: string, group: string, fields: Partial<CaseScore>) {
  const base: CaseScore = {
    id,
    source: "test",
    language: "fr",
    genre: "test",
    group,
    length: 10,
    skipped: null,
    sensitive: 0,
    leaked: 0,
    mergeLeaked: 0,
    ignored: 0,
    clean: 0,
    overMasked: 0,
    falsePositives: 0,
    mentions: [],
    entities: { total: 0, protected: 0 },
    keep: { total: 0, destroyed: 0 },
    exact: { tp: 0, fp: 0, fn: 0 },
    placeholders: { samePairs: 0, split: 0, distinctPairs: 0, merged: 0 },
  };
  return { ...base, ...fields };
}

it("weighs characters for micro and mentions for macro", () => {
  const scores = [
    score("a", "g1", {
      sensitive: 40,
      leaked: 4,
      mentions: [
        { type: "LOCATION", length: 36, leaked: 0, predicted: "LOCATION" },
        { type: "PERSON", length: 4, leaked: 4, predicted: null },
      ],
    }),
  ];
  expect(leakMicro(scores)).toBe(0.1);
  expect(leakMacro(scores)).toBe(0.5);
});

it("reports an empty denominator as unavailable, not as zero", () => {
  expect(leakMicro([score("a", "g1", {})])).toBeNull();
  expect(overMasking([])).toBeNull();
});

it("gives a constant difference a zero-width paired interval", () => {
  const on = ["g1", "g2", "g3"].map((g) =>
    score(g, g, { sensitive: 10, leaked: 2 }),
  );
  const off = ["g1", "g2", "g3"].map((g) =>
    score(g, g, { sensitive: 10, leaked: 5 }),
  );
  const [low, high] = pairedInterval(on, off, leakMicro) ?? [];
  expect(low).toBeCloseTo(-0.3);
  expect(high).toBeCloseTo(-0.3);
});

it("refuses to pair different cases", () => {
  const on = [score("a", "g1", {}), score("b", "g2", {})];
  const off = [score("a", "g1", {}), score("c", "g2", {})];
  expect(() => pairedInterval(on, off, leakMicro)).toThrow();
});

it("gives no interval under two groups", () => {
  const scores = [
    score("a", "g1", { sensitive: 10, leaked: 1 }),
    score("b", "g1", { sensitive: 10, leaked: 3 }),
  ];
  expect(interval(scores, leakMicro)).toBeNull();
});
