import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { SemanticOptions } from "../src/detection/semantic";
import { maskText } from "../src/mask-text";
import { DEFAULT_TIMEOUT_MS } from "../src/preferences";
import type { Case } from "./cases";
import { sha256 } from "./sources/fetch";
import { type CaseScore, overlap, scoreCase } from "./score";

export type Mode = "on" | "off";

/** The extension's defaults, so a timeout counts as the outcome a user gets. */
export function optionsFor(mode: Mode, baseUrl: string): SemanticOptions {
  return {
    baseUrl,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    authToken: "",
    phoneRegions: ["FR"],
    maskPersons: mode === "on",
    maskLocations: mode === "on",
    maskOrganizations: mode === "on",
  };
}

export interface CaseRecord {
  readonly mode: Mode;
  readonly order: number;
  readonly ms: number;
  readonly score: CaseScore;
}

/** Leaked values live only in the external cache, never in the repository. */
export interface CaseDetail {
  readonly id: string;
  readonly mode: Mode;
  readonly order: number;
  readonly ms: number;
  readonly skipped: string | null;
  readonly leaked: Array<{ type: string; value: string }>;
  readonly falsePositives: Array<{ type: string; value: string }>;
  readonly destroyed: string[];
  readonly spans: Array<[string, number, number]>;
}

/** One request at a time: the detector serialises inference behind a lock,
 * so concurrency would measure its queue. */
export async function runCases(
  cases: readonly Case[],
  mode: Mode,
  baseUrl: string,
  onCase: (record: CaseRecord, detail: CaseDetail) => Promise<void>,
): Promise<void> {
  const options = optionsFor(mode, baseUrl);
  let order = 0;
  for (const item of cases) {
    const started = performance.now();
    const result = await maskText(item.text, options);
    const ms = performance.now() - started;
    const score = scoreCase(item, result);
    const value = (r: { start: number; end: number }) =>
      item.text.slice(r.start, r.end);
    await onCase(
      { mode, order, ms, score },
      {
        id: item.id,
        mode,
        order,
        ms,
        skipped: result.semanticSkipped,
        leaked: item.mask
          .filter((_, i) => (score.mentions[i]?.leaked ?? 0) > 0)
          .map((gold) => ({ type: gold.type, value: value(gold) })),
        falsePositives: result.spans
          .filter(
            (span) =>
              ![...item.mask, ...item.ignore].some(
                (region) => overlap(region, span) > 0,
              ),
          )
          .map((span) => ({ type: span.type, value: value(span) })),
        destroyed: item.keep
          .filter((region) =>
            result.spans.some((span) => overlap(span, region) > 0),
          )
          .map(value),
        spans: result.spans.map((s) => [s.type, s.start, s.end]),
      },
    );
    order++;
  }
}

const run = promisify(execFile);

async function fileDigest(path: string): Promise<string> {
  return sha256(await readFile(path)).slice(0, 12);
}

/** Enough to tell whether two runs are comparable: same pipeline, same
 * detector configuration, same model. */
export async function describeEnvironment(
  baseUrl: string,
): Promise<Record<string, unknown>> {
  const head = (await run("git", ["rev-parse", "--short=12", "HEAD"])).stdout;
  const status = (await run("git", ["status", "--porcelain"])).stdout;
  let detector: unknown = null;
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    detector = response.ok ? await response.json() : null;
  } catch {
    detector = null;
  }
  return {
    pipeline: head.trim(),
    dirty: status.trim().length > 0,
    node: process.version,
    detectorUrl: baseUrl,
    detector,
    compose: await fileDigest("compose.yaml"),
    detectorPatch: await fileDigest("assets/detector-patch/gliner_layer.py"),
  };
}
