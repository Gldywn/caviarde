import type { EntityType } from "../../src/detection/types";
import { isIbanValid } from "../../src/detection/validators/iban";
import { isNonIdentifyingIp } from "../../src/detection/validators/ip";
import { isLuhnValid } from "../../src/detection/validators/luhn";
import { type Case, type GoldSpan, HarnessError, type Region } from "../cases";

/** A source label maps to one of our types, to "ignore", or to a decision on
 * the annotated value when the label alone does not settle it. */
export type LabelPolicy = Readonly<
  Record<
    string,
    EntityType | "ignore" | ((value: string) => EntityType | "ignore")
  >
>;

/** Real cards pass Luhn and real IBANs mod-97, so a generator's invalid ones
 * would measure the generator. Loopback and link-local addresses identify
 * nobody and are left alone on purpose (docs/limitations.md). */
function refusal(type: EntityType, value: string): string | null {
  if (type === "CARD") {
    const digits = value.replace(/[ -]/g, "");
    return /^\d{12,19}$/.test(digits) && isLuhnValid(digits)
      ? null
      : "CARD failing Luhn";
  }
  if (type === "IBAN") return isIbanValid(value) ? null : "IBAN failing mod-97";
  if (type === "IP" && isNonIdentifyingIp(value)) return "non-identifying IP";
  return null;
}

/** Run before scoring anything: a label the table does not name would
 * otherwise be scored under someone's guess. */
export function assertCovered(
  policy: LabelPolicy,
  labels: Iterable<string>,
): void {
  const missing = new Set([...labels].filter((label) => !(label in policy)));
  if (missing.size > 0)
    throw new HarnessError(
      `Labels without a policy: ${[...missing].join(", ")}`,
    );
}

/** Python indexes strings by code point, JavaScript by UTF-16 code unit. */
function codePointOffsets(text: string): number[] {
  const offsets = [0];
  let unit = 0;
  for (const char of text) {
    unit += char.length;
    offsets.push(unit);
  }
  return offsets;
}

export interface Annotation {
  readonly label: string;
  readonly start: unknown;
  readonly end: unknown;
  /** The annotated surface string, when the source provides one. */
  readonly value?: string;
  /** Why the annotation is out of scope whatever its label. */
  readonly ignore?: string;
}

export type Quarantine = "bounds" | "misaligned" | "blank" | "unparseable";

export type Gold =
  | {
      readonly ok: true;
      readonly mask: GoldSpan[];
      readonly ignore: Region[];
      /** Why annotations that carry one of our types became ignored regions. */
      readonly excluded: string[];
    }
  | { readonly ok: false; readonly reason: Quarantine };

/** One bad annotation quarantines the whole record: dropping only that span
 * would turn its sensitive characters into clean text. Offsets are checked,
 * never searched for again. */
export function toGold(
  text: string,
  annotations: readonly Annotation[],
  policy: LabelPolicy,
  codePoints: boolean,
): Gold {
  const units = codePoints ? codePointOffsets(text) : null;
  const limit = units === null ? text.length : units.length - 1;
  const mask: GoldSpan[] = [];
  const ignore: Region[] = [];
  const excluded: string[] = [];

  for (const annotation of annotations) {
    const { start, end } = annotation;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start >= end ||
      end > limit
    )
      return { ok: false, reason: "bounds" };

    const region = {
      start: units === null ? start : (units[start] ?? start),
      end: units === null ? end : (units[end] ?? end),
    };
    const value = text.slice(region.start, region.end);
    if (annotation.value !== undefined && annotation.value !== value)
      return { ok: false, reason: "misaligned" };
    if (value.trim().length === 0) return { ok: false, reason: "blank" };

    const rule = policy[annotation.label];
    if (rule === undefined)
      throw new HarnessError(`Label without a policy: ${annotation.label}`);
    const type = typeof rule === "function" ? rule(value) : rule;
    if (type === "ignore") {
      ignore.push(region);
      continue;
    }
    const why = annotation.ignore ?? refusal(type, value);
    if (why !== null) {
      ignore.push(region);
      excluded.push(why);
      continue;
    }
    mask.push({ ...region, type });
  }

  return { ok: true, mask, ignore, excluded };
}

export interface Loaded {
  readonly cases: Case[];
  readonly total: number;
  /** Records refused at ingestion, keyed `language/reason`. */
  readonly quarantined: ReadonlyMap<string, number>;
  /** In-scope annotations turned into ignored regions, by reason. */
  readonly excluded: ReadonlyMap<string, number>;
}

export function countInto(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}
