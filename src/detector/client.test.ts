import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze, isHealthy } from "./client";

const CONFIG = {
  baseUrl: "http://127.0.0.1:5002/",
  timeoutMs: 2000,
  authToken: "fake-token",
};

const REQUEST = {
  text: "Marie Dubois, marie@example.fr",
  types: ["IP", "SIREN", "CARD", "PERSON"] as const,
  phoneRegions: ["FR"],
};

function stubFetch(answer: () => Promise<Response>) {
  const fetch = vi.fn(answer);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function timeout(): Promise<Response> {
  return Promise.reject(new DOMException("timed out", "TimeoutError"));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyze", () => {
  it("sends only labels the detector knows, in its own order", async () => {
    const fetch = stubFetch(async () => Response.json([]));
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
  });

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
    ["timeout", timeout],
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
    expect(await isHealthy(CONFIG)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5002/health",
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-token" },
      }),
    );
  });

  it.each([
    ["rejected", () => Promise.reject(new TypeError("fetch failed"))],
    ["timed out", timeout],
    ["answered 401", async () => new Response("", { status: 401 })],
  ] as const)("answers false when %s", async (_, answer) => {
    stubFetch(answer);
    expect(await isHealthy(CONFIG)).toBe(false);
  });
});
