import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  SEMANTIC_MAX_CHARS,
  type SemanticOptions,
} from "../src/detection/semantic";
import type { Region } from "./cases";
import { isLuhnValid } from "../src/detection/validators/luhn";
import { maskText } from "../src/mask-text";
import type { Span } from "../src/detection/types";
import { HOME_CASES } from "./home";
import { shippedPhoneRegions } from "./run";
import { placeholdersOf, scoreCase } from "./score";

const BASE_URL = process.env.CAVIARDE_DETECTOR_URL ?? "http://127.0.0.1:5002";

const LOCAL: SemanticOptions = {
  baseUrl: BASE_URL,
  timeoutMs: 3500,
  authToken: "",
  phoneRegions: shippedPhoneRegions(),
  maskPersons: false,
  maskLocations: false,
  maskOrganizations: false,
};

const LIVE: SemanticOptions = {
  ...LOCAL,
  timeoutMs: 10_000,
  maskPersons: true,
  maskLocations: true,
  maskOrganizations: true,
};

/** The scorer numbers placeholders by replaying applyMasking; rebuilding the
 * masked text from that replay ties it to what production actually pasted. */
function replayed(text: string, spans: readonly Span[]): string {
  const placeholders = placeholdersOf(text, spans);
  let masked = text;
  for (const span of [...spans].sort((a, b) => b.start - a.start))
    masked =
      masked.slice(0, span.start) +
      (placeholders.get(span) ?? "") +
      masked.slice(span.end);
  return masked;
}

function positions(spans: readonly (Region & { type: string })[]) {
  return spans
    .map(({ type, start, end }) => ({ type, start, end }))
    .sort((a, b) => a.start - b.start);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// AGENTS.md: an identifier left alone proves the guard only if it would pass
// the checksum on its own.
describe("home dataset premises", () => {
  it("puts the size cases on either side of the semantic cap", () => {
    const length = (id: string) =>
      HOME_CASES.find((c) => c.id === `home:${id}`)?.text.length;
    expect(length("detector-at-cap")).toBe(SEMANTIC_MAX_CHARS);
    expect(length("size-over-cap")).toBe(SEMANTIC_MAX_CHARS + 1);
  });

  for (const item of HOME_CASES.filter((c) => c.luhn)) {
    it(`${item.id}: every kept value passes Luhn`, () => {
      expect(item.keep.length).toBeGreaterThan(0);
      for (const { start, end } of item.keep)
        expect(isLuhnValid(item.text.slice(start, end))).toBe(true);
    });
  }
});

describe("home dataset, deterministic layer only", () => {
  for (const item of HOME_CASES.filter((c) => c.layer === "local")) {
    it(`${item.id}: ${item.note}`, async () => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);

      const result = await maskText(item.text, LOCAL);

      expect(fetch).not.toHaveBeenCalled();
      expect(result.semanticSkipped).toBe("disabled");
      expect(positions(result.spans)).toEqual(positions(item.mask));
      expect(replayed(item.text, result.spans)).toBe(result.masked);
      expect(scoreCase(item, result).placeholders).toMatchObject({
        split: 0,
        merged: 0,
      });
    });
  }
});

let detectorUp = false;

beforeAll(async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    detectorUp = response.ok;
  } catch {
    detectorUp = false;
  }
});

/** Every case, local ones included: the detector once masked a Luhn-valid
 * timestamp as a card, so identifiers are proven with it running too. */
describe("home dataset, live detector", () => {
  for (const item of HOME_CASES) {
    it(`${item.id}: ${item.note}`, async ({ skip }) => {
      if (!detectorUp) skip();

      const result = await maskText(item.text, LIVE);
      const score = scoreCase(item, result);

      expect(result.semanticSkipped).toBe(
        item.text.length > SEMANTIC_MAX_CHARS ? "too-large" : null,
      );
      expect({
        leaked: score.leaked,
        destroyed: score.keep.destroyed,
      }).toEqual({ leaked: 0, destroyed: 0 });
      expect(replayed(item.text, result.spans)).toBe(result.masked);
      // A text with nothing to mask must come back unchanged, as the migrated
      // identifier cases did: over-masking elsewhere is measured, not gated.
      if (item.mask.length === 0) expect(result.masked).toBe(item.text);
    });
  }
});
