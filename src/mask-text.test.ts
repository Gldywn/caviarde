import { afterEach, expect, it, vi } from "vitest";
import type { SemanticOptions } from "./detection/semantic";
import { maskText } from "./mask-text";

const OFFLINE: SemanticOptions = {
  baseUrl: "http://127.0.0.1:5002",
  timeoutMs: 3500,
  authToken: "",
  phoneRegions: ["FR"],
  maskPersons: false,
  maskLocations: false,
  maskOrganizations: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

it("runs the whole pipeline, propagation included, with no detector", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);

  const result = await maskText(
    "Marie valide demain. @Marie Dubois a relu.",
    OFFLINE,
  );

  expect(fetch).not.toHaveBeenCalled();
  expect(result).toEqual({
    masked: "[PERSON_1] valide demain. @[PERSON_1] a relu.",
    counts: new Map([["PERSON", 1]]),
    semanticSkipped: "disabled",
    spans: [
      { type: "PERSON", start: 22, end: 34, layer: "deterministic" },
      {
        type: "PERSON",
        start: 0,
        end: 5,
        layer: "deterministic",
        alias: "Marie Dubois",
      },
    ],
    dropped: [],
  });
});

// No merge runs after propagation, so a lone first name two people share must
// come back as one span, or the replacements splice into each other.
it("masks a first name shared by two people once", async () => {
  const { masked } = await maskText(
    "@Camille Rousseau et @Camille Bernard. Camille valide.",
    OFFLINE,
  );

  expect(masked).toBe("@[PERSON_1] et @[PERSON_2]. [PERSON_1] valide.");
});

it("reports the semantic spans the merge refused", async () => {
  const text = "Ecrire a marie.dubois@acme-solutions.fr demain";
  const person = { entity_type: "PERSON", start: 9, end: 21, score: 0.99 };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify([person]))),
  );

  const result = await maskText(text, { ...OFFLINE, maskPersons: true });

  expect(result.semanticSkipped).toBeNull();
  expect(result.spans).toEqual([
    { type: "EMAIL", start: 9, end: 39, layer: "deterministic" },
  ]);
  expect(result.dropped).toEqual([
    { type: "PERSON", start: 9, end: 21, layer: "semantic" },
  ]);
});
