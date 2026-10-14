import { expect, it } from "vitest";
import { assertUniqueIds, type LabelPolicy, toGold } from "./policy";

const POLICY: LabelPolicy = {
  name: "PERSON",
  email: "EMAIL",
  card: "CARD",
  ref: "ignore",
};

// Code-point offsets, as Python counts them: the emoji is one code point and
// two UTF-16 units.
const TEXT = "🙂 Marie Dubois puis Marie Dubois, marie@acme-solutions.fr";

it("converts code points to UTF-16 once and keeps the annotated occurrence", () => {
  const gold = toGold(
    TEXT,
    [
      { label: "name", start: 20, end: 32, value: "Marie Dubois" },
      { label: "email", start: 34, end: 57, value: "marie@acme-solutions.fr" },
    ],
    POLICY,
    true,
  );

  expect(gold).toEqual({
    ok: true,
    mask: [
      { type: "PERSON", start: 21, end: 33 },
      { type: "EMAIL", start: 35, end: 58 },
    ],
    ignore: [],
    excluded: [],
  });
});

it("quarantines the whole record for one bad annotation, ignored ones included", () => {
  const valid = { label: "name", start: 2, end: 14, value: "Marie Dubois" };
  expect(
    toGold(TEXT, [valid, { label: "ref", start: 50, end: 99 }], POLICY, true),
  ).toEqual({ ok: false, reason: "bounds" });
  expect(
    toGold(
      TEXT,
      [valid, { label: "name", start: 20, end: 32, value: "Marie Dupont" }],
      POLICY,
      true,
    ),
  ).toEqual({ ok: false, reason: "misaligned" });
});

it("ignores a gold card that could not be a real one, and says why", () => {
  const gold = toGold(
    "carte 4111 1111 1111 1112",
    [{ label: "card", start: 6, end: 25 }],
    POLICY,
    false,
  );
  expect(gold).toEqual({
    ok: true,
    mask: [],
    ignore: [{ start: 6, end: 25 }],
    excluded: ["CARD failing Luhn"],
  });
});

it("refuses a label the policy does not name", () => {
  expect(() =>
    toGold(TEXT, [{ label: "nickname", start: 2, end: 7 }], POLICY, true),
  ).toThrow("Label without a policy: nickname");
});

it("refuses a source whose case ids repeat", () => {
  const item = {
    id: "redact:1",
    source: "redact",
    language: "es",
    genre: "email",
    group: "pattern:x",
    text: "",
    mask: [],
    keep: [],
    ignore: [],
  };
  expect(() =>
    assertUniqueIds("redact", [item, { ...item, text: "other" }]),
  ).toThrow("Duplicate case id in redact: redact:1");
});

it("tells a truncated card from one failing Luhn", () => {
  const gold = toGold(
    "carte se terminant par 4821",
    [{ label: "card", start: 23, end: 27 }],
    POLICY,
    false,
  );
  expect(gold).toMatchObject({
    ok: true,
    excluded: ["CARD not a full number"],
  });
});
