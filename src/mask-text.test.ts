import { afterEach, expect, it, vi } from "vitest";
import { maskText } from "./mask-text";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("runs the whole pipeline, propagation included, with no detector", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);

  const result = await maskText("@Marie Dubois a relu. Marie valide demain.", {
    baseUrl: "http://127.0.0.1:5002",
    timeoutMs: 3500,
    authToken: "",
    phoneRegions: ["FR"],
    maskPersons: false,
    maskLocations: false,
    maskOrganizations: false,
  });

  expect(fetch).not.toHaveBeenCalled();
  expect(result).toEqual({
    masked: "@[PERSON_1] a relu. [PERSON_1] valide demain.",
    counts: new Map([["PERSON", 1]]),
    semanticSkipped: "disabled",
  });
});
