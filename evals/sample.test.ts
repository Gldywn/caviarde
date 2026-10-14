import { expect, it } from "vitest";
import type { Case } from "./cases";
import { drawSample, splitOf } from "./sample";

const CASES: Case[] = Array.from({ length: 600 }, (_, i) => ({
  id: `test:${i}`,
  source: "test",
  language: i % 2 === 0 ? "fr" : "ja",
  genre: "test",
  group: `g${Math.floor(i / 3)}`,
  text: "",
  mask: [],
  keep: [],
  ignore: [],
}));

it("draws the same pinned sample every time", () => {
  expect(drawSample(CASES, "r1")).toEqual(
    drawSample([...CASES].reverse(), "r1"),
  );
});

it("keeps groups whole, sizes per tier, and noise inside development", () => {
  const sample = drawSample(CASES, "r1");
  const groupOf = new Map(CASES.map((c) => [c.id, c.group]));
  const devGroups = new Set(sample.dev.map((id) => groupOf.get(id)));
  const holdoutGroups = new Set(sample.holdout.map((id) => groupOf.get(id)));

  expect([...devGroups].filter((g) => holdoutGroups.has(g))).toEqual([]);
  expect(
    CASES.every((c) => splitOf(c) === splitOf({ ...c, id: "other" })),
  ).toBe(true);
  expect(sample.dev.filter((id) => Number(id.slice(5)) % 2 === 0)).toHaveLength(
    60,
  );
  expect(sample.dev.filter((id) => Number(id.slice(5)) % 2 === 1)).toHaveLength(
    20,
  );
  expect(sample.noise.every((id) => sample.dev.includes(id))).toBe(true);
  expect(sample.noise).toHaveLength(6);
});
