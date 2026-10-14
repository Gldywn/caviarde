/** The only module that knows the detector's endpoint, payload and response
 * shape, so an upstream change to an unversioned API is a one-file fix. */

import type { EntityType } from "../detection/types";

const ANALYZE_PATH = "/analyze";
const HEALTH_PATH = "/health";

const LABEL_TO_TYPE: ReadonlyMap<string, EntityType> = new Map([
  ["PERSON", "PERSON"],
  ["LOCATION", "LOCATION"],
  ["ORGANIZATION", "ORGANIZATION"],
  ["EMAIL_ADDRESS", "EMAIL"],
  ["PHONE_NUMBER", "PHONE"],
  ["CREDIT_CARD", "CARD"],
  ["IBAN_CODE", "IBAN"],
  ["IP_ADDRESS", "IP"],
  ["VAT_CODE", "VAT"],
]);

interface WireEntity {
  readonly entity_type: string;
  readonly start: number;
  readonly end: number;
  readonly score: number;
}

export interface DetectorEntity {
  readonly type: EntityType;
  readonly start: number;
  readonly end: number;
}

export interface AnalyzeRequest {
  readonly text: string;
  readonly types: readonly EntityType[];
  readonly phoneRegions: readonly string[];
}

export interface DetectorConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly authToken: string;
}

export type AnalyzeOutcome =
  | { readonly ok: true; readonly entities: readonly DetectorEntity[] }
  | {
      readonly ok: false;
      readonly reason: "unreachable" | "timeout" | "failed";
    };

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function authorization(authToken: string): Record<string, string> {
  return authToken.length > 0 ? { Authorization: `Bearer ${authToken}` } : {};
}

/** The detector answers a label it does not know with nothing rather than an
 * error, and reads an empty list as every label, so only known labels are
 * sent, and never none. */
function labelsFor(types: readonly EntityType[]): string[] {
  return [...LABEL_TO_TYPE]
    .filter(([, type]) => types.includes(type))
    .map(([label]) => label);
}

function isEntity(value: unknown): value is WireEntity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.entity_type === "string" &&
    Number.isInteger(candidate.start) &&
    Number.isInteger(candidate.end) &&
    typeof candidate.score === "number"
  );
}

function toEntity(wire: WireEntity): DetectorEntity | null {
  const type = LABEL_TO_TYPE.get(wire.entity_type);
  return type === undefined ? null : { type, start: wire.start, end: wire.end };
}

/** Never throws and never surfaces the submitted text: every failure is a reason
 * the caller degrades on. */
export async function analyze(
  request: AnalyzeRequest,
  config: DetectorConfig,
): Promise<AnalyzeOutcome> {
  const labels = labelsFor(request.types);
  if (labels.length === 0) return { ok: true, entities: [] };

  let response: Response;
  try {
    response = await fetch(endpoint(config.baseUrl, ANALYZE_PATH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authorization(config.authToken),
      },
      body: JSON.stringify({
        text: request.text,
        entities: labels,
        phone_regions: request.phoneRegions,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      ok: false,
      reason: name === "TimeoutError" ? "timeout" : "unreachable",
    };
  }

  if (!response.ok) return { ok: false, reason: "failed" };

  try {
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return { ok: false, reason: "failed" };
    return {
      ok: true,
      entities: payload
        .filter(isEntity)
        .map(toEntity)
        .filter((entity): entity is DetectorEntity => entity !== null),
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** The token goes out here too: a detector that also protects /health works
 * for masking while a probe without it would call it unreachable. Never
 * throws. */
export async function isHealthy(config: DetectorConfig): Promise<boolean> {
  try {
    const response = await fetch(endpoint(config.baseUrl, HEALTH_PATH), {
      headers: authorization(config.authToken),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}
