import { afterEach, describe, expect, it, vi } from "vitest";
import { ENTITY_TYPES } from "../detection/types";
import { analyze, isHealthy } from "./client";

const CONFIG = {
  baseUrl: "http://127.0.0.1:5002/",
  timeoutMs: 1234,
  authToken: "fake-token",
};

const REQUEST = {
  text: "Marie Dubois, marie@example.fr",
  types: ["IP", "SIREN", "CARD", "PERSON"] as const,
  phoneRegions: ["FR"],
};

/** Written out rather than imported: CI runs without a detector, so this is
 * the only place a misspelt label fails. */
const CONTRACT = [
  ["PERSON", "PERSON"],
  ["LOCATION", "LOCATION"],
  ["ORGANIZATION", "ORGANIZATION"],
  ["EMAIL_ADDRESS", "EMAIL"],
  ["PHONE_NUMBER", "PHONE"],
  ["CREDIT_CARD", "CARD"],
  ["IBAN_CODE", "IBAN"],
  ["IP_ADDRESS", "IP"],
  ["VAT_CODE", "VAT"],
] as const;

function stubFetch(answer: () => Promise<Response>) {
  const fetch = vi.fn(answer);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function timedOut(): Promise<Response> {
  return Promise.reject(new DOMException("timed out", "TimeoutError"));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("analyze", () => {
  it("sends only labels the detector knows, in its own order", async () => {
    const fetch = stubFetch(async () => Response.json([]));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await analyze(REQUEST, CONFIG);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:5002/analyze");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    });
    expect(init.body).toBe(
      JSON.stringify({
        text: REQUEST.text,
        entities: ["PERSON", "CREDIT_CARD", "IP_ADDRESS"],
        phone_regions: ["FR"],
      }),
    );
    expect(timeout).toHaveBeenCalledWith(1234);
    expect(init.signal).toBe(timeout.mock.results[0]?.value);
  });

  it("spells every label the detector knows, both ways", async () => {
    const fetch = stubFetch(async () =>
      Response.json(
        CONTRACT.map(([label], index) => ({
          entity_type: label,
          start: index,
          end: index + 1,
          score: 0.9,
        })),
      ),
    );
    const outcome = await analyze({ ...REQUEST, types: ENTITY_TYPES }, CONFIG);

    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).entities).toEqual(
      CONTRACT.map(([label]) => label),
    );
    expect(outcome).toEqual({
      ok: true,
      entities: CONTRACT.map(([, type], index) => ({
        type,
        start: index,
        end: index + 1,
      })),
    });
  });

  it.each([[[]], [["SIREN", "API_KEY"]]] as const)(
    "never sends an empty selection, which the detector reads as every label (%j)",
    async (types) => {
      const fetch = stubFetch(async () => Response.json([]));
      expect(await analyze({ ...REQUEST, types }, CONFIG)).toEqual({
        ok: true,
        entities: [],
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("answers in local types and drops what it cannot map", async () => {
    stubFetch(async () =>
      Response.json([
        { entity_type: "PERSON", start: 0, end: 12, score: 0.9 },
        { entity_type: "NOT_A_LABEL", start: 0, end: 5, score: 0.9 },
        { entity_type: "constructor", start: 0, end: 5, score: 0.9 },
        { entity_type: "EMAIL_ADDRESS", start: "14", end: 30, score: 0.9 },
        { entity_type: "EMAIL_ADDRESS", start: 14, end: 30 },
      ]),
    );
    expect(await analyze(REQUEST, CONFIG)).toEqual({
      ok: true,
      entities: [{ type: "PERSON", start: 0, end: 12 }],
    });
  });

  it.each([
    ["unreachable", () => Promise.reject(new TypeError("fetch failed"))],
    ["timeout", timedOut],
    ["failed", async () => new Response("busy", { status: 503 })],
    ["failed", async () => new Response("not json")],
    ["failed", async () => Response.json({ entities: [] })],
  ] as const)("degrades to %s instead of throwing", async (reason, answer) => {
    stubFetch(answer);
    expect(await analyze(REQUEST, CONFIG)).toEqual({ ok: false, reason });
  });
});

describe("isHealthy", () => {
  it("sends the token, so a detector that protects /health reads as up", async () => {
    const fetch = stubFetch(async () => new Response("ok"));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    expect(await isHealthy(CONFIG)).toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:5002/health", {
      headers: { Authorization: "Bearer fake-token" },
      signal: timeout.mock.results[0]?.value,
    });
    expect(timeout).toHaveBeenCalledWith(1234);
  });

  it("sends no Authorization header without a token", async () => {
    const fetch = stubFetch(async () => new Response("ok"));
    await isHealthy({ ...CONFIG, authToken: "" });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5002/health",
      expect.objectContaining({ headers: {} }),
    );
  });

  it.each([
    ["rejected", () => Promise.reject(new TypeError("fetch failed"))],
    ["timed out", timedOut],
    ["answered 401", async () => new Response("", { status: 401 })],
  ] as const)("answers false when %s", async (_, answer) => {
    stubFetch(answer);
    expect(await isHealthy(CONFIG)).toBe(false);
  });
});
