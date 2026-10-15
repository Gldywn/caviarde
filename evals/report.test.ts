import { expect, it } from "vitest";
import { renderComparison } from "./report";
import type { CaseRecord } from "./run";
import type { CaseScore } from "./score";

function record(group: string, leaked: number, overMasked: number) {
  const score: CaseScore = {
    id: group,
    source: "test",
    language: "fr",
    genre: "test",
    group,
    length: 100,
    skipped: null,
    sensitive: 10,
    leaked,
    mergeLeaked: 0,
    ignored: 0,
    clean: 90,
    overMasked,
    falsePositives: 0,
    mentions: [{ type: "PERSON", length: 10, leaked, predicted: null }],
    entities: { total: 0, protected: 0 },
    keep: { total: 0, destroyed: 0 },
    exact: { tp: 0, fp: 0, fn: 0 },
    placeholders: { samePairs: 0, split: 0, distinctPairs: 0, merged: 0 },
  };
  return { mode: "on", order: 0, ms: 0, score } satisfies CaseRecord;
}

const GROUPS = ["g1", "g2", "g3"];

it("reports candidate minus reference with its paired interval", () => {
  const candidate = GROUPS.map((g) => record(g, 2, 9));
  const reference = GROUPS.map((g) => record(g, 5, 0));
  const report = renderComparison(candidate, reference);
  expect(report).toContain(
    "| test | Leaked chars | 20.0 % | 50.0 % | -30.0 % | [-30.0 %, -30.0 %] |",
  );
  expect(report).toContain(
    "| test | Over-masking | 10.0 % | 0.0 % | 10.0 % | [10.0 %, 10.0 %] |",
  );
});

it("refuses runs over different cases", () => {
  const candidate = GROUPS.map((g) => record(g, 2, 0));
  const reference = ["g1", "g2", "g4"].map((g) => record(g, 2, 0));
  expect(() => renderComparison(candidate, reference)).toThrow(/same cases/);
});

it("leaves out a case that timed out in either run and lists each run's skips", () => {
  const skip = (r: CaseRecord, why: "timeout" | "unreachable"): CaseRecord => ({
    ...r,
    score: { ...r.score, skipped: why },
  });
  const both = GROUPS.map((g) => record(g, 2, 0));
  const report = renderComparison(
    [
      ...both,
      skip(record("g4", 10, 0), "timeout"),
      skip(record("g5", 10, 0), "timeout"),
      skip(record("g6", 10, 0), "timeout"),
      record("g7", 0, 0),
    ],
    [
      ...both,
      record("g4", 0, 0),
      record("g5", 0, 0),
      skip(record("g6", 10, 0), "timeout"),
      skip(record("g7", 10, 0), "unreachable"),
    ],
  );
  expect(report).toContain(
    "| test | Leaked chars | 15.0 % | 40.0 % | -25.0 % |",
  );
  expect(report).toContain(
    "Semantic skipped, candidate: test timeout 3; reference: test timeout 1, " +
      "test unreachable 1. Left out of both, timed out in either run: test 3.",
  );
});
