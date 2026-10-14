import { expect, it } from "vitest";
import type { Span } from "../src/detection/types";
import type { Case } from "./cases";
import { scoreCase } from "./score";

function item(text: string, fields: Partial<Case>): Case {
  return {
    id: "t",
    source: "test",
    language: "fr",
    genre: "test",
    group: "t",
    text,
    mask: [],
    keep: [],
    ignore: [],
    ...fields,
  };
}

const span = (
  type: Span["type"],
  start: number,
  end: number,
  extra: Partial<Span> = {},
): Span => ({ type, start, end, layer: "deterministic", ...extra });

it("counts each character once and attributes leaks to the merge", () => {
  const text = "Marie Dubois, marie@acme.fr, ref 42, 127.0.0.1";
  const score = scoreCase(
    item(text, {
      mask: [
        { type: "PERSON", start: 0, end: 12, entity: "a" },
        { type: "PERSON", start: 6, end: 12 },
        { type: "EMAIL", start: 14, end: 27 },
      ],
      ignore: [{ start: 33, end: 35 }],
      keep: [{ start: 37, end: 46 }],
    }),
    {
      spans: [
        span("PERSON", 0, 5),
        span("EMAIL", 14, 27),
        span("ORGANIZATION", 29, 32),
        span("IP", 37, 46),
      ],
      dropped: [span("PERSON", 0, 12, { layer: "semantic" })],
      semanticSkipped: null,
    },
  );

  expect(score).toMatchObject({
    sensitive: 25,
    leaked: 7,
    mergeLeaked: 7,
    ignored: 2,
    clean: 19,
    overMasked: 12,
    falsePositives: 2,
    entities: { total: 1, protected: 0 },
    keep: { total: 1, destroyed: 1 },
    exact: { tp: 1, fp: 3, fn: 2 },
  });
  expect(score.mentions.map((m) => [m.leaked, m.predicted])).toEqual([
    [7, "PERSON"],
    [6, null],
    [0, "EMAIL"],
  ]);
});

it("replays production placeholders to judge consistency", () => {
  const text = "@Camille Rousseau, @Camille Bernard, Camille";
  const score = scoreCase(
    item(text, {
      mask: [
        { type: "PERSON", start: 1, end: 17, entity: "a" },
        { type: "PERSON", start: 20, end: 35, entity: "b" },
        { type: "PERSON", start: 37, end: 44, entity: "b" },
      ],
    }),
    {
      spans: [
        span("PERSON", 1, 17),
        span("PERSON", 20, 35),
        span("PERSON", 37, 44, { alias: "Camille Rousseau" }),
      ],
      dropped: [],
      semanticSkipped: "disabled",
    },
  );

  expect(score.placeholders).toEqual({
    samePairs: 1,
    split: 1,
    distinctPairs: 2,
    merged: 1,
  });
});

it("exempts from exact precision only spans wholly inside ignored text", () => {
  const prediction = (spans: Span[]) => ({
    spans,
    dropped: [],
    semanticSkipped: null,
  });
  const marie = item("Marie 42", {
    mask: [{ type: "PERSON", start: 0, end: 5 }],
    ignore: [{ start: 6, end: 8 }],
  });

  expect(scoreCase(marie, prediction([span("PERSON", 0, 8)])).exact).toEqual({
    tp: 0,
    fp: 1,
    fn: 1,
  });
  expect(
    scoreCase(marie, prediction([span("PERSON", 0, 5), span("PHONE", 6, 8)]))
      .exact,
  ).toEqual({ tp: 1, fp: 0, fn: 0 });
});
