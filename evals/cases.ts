import { ENTITY_TYPES, type EntityType } from "../src/detection/types";

/** Half-open UTF-16 offsets, the convention of `Span`. */
export interface Region {
  readonly start: number;
  readonly end: number;
}

export interface GoldSpan extends Region {
  readonly type: EntityType;
  /** Mentions sharing an id are one person or thing. Only sources that state
   * it carry it; nothing is inferred from equal strings. */
  readonly entity?: string;
}

/** The one shape every source is converted to, the home dataset included. */
export interface Case {
  readonly id: string;
  readonly source: string;
  readonly language: string;
  readonly genre: string;
  /** Template or document family: split and bootstrap never separate a group. */
  readonly group: string;
  readonly text: string;
  readonly mask: readonly GoldSpan[];
  /** Technical identifiers that must come out untouched. */
  readonly keep: readonly Region[];
  /** Annotated, but outside what Caviarde claims to mask: neither a leak nor a
   * false positive. */
  readonly ignore: readonly Region[];
}

const MARKUP = /\[\[([A-Z_]+)(?:#([A-Za-z0-9]+))?:(.+?)\]\]|\{\{(.+?)\}\}/gsu;

function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

/** `[[EMAIL:x]]` is to be masked, `[[PERSON#a:x]]` also names its entity, and
 * `{{x}}` must survive. Offsets come from the parser so nobody counts them. */
export function parseMarkup(markup: string): {
  text: string;
  mask: GoldSpan[];
  keep: Region[];
} {
  const mask: GoldSpan[] = [];
  const keep: Region[] = [];
  let text = "";
  let last = 0;

  for (const match of markup.matchAll(MARKUP)) {
    const [whole, type, entity, masked, kept] = match;
    text += markup.slice(last, match.index);
    last = match.index + whole.length;

    const start = text.length;
    if (kept !== undefined) {
      text += kept;
      keep.push({ start, end: text.length });
      continue;
    }
    if (type === undefined || masked === undefined || !isEntityType(type))
      throw new HarnessError(`Unknown entity type in markup: ${type}`);
    text += masked;
    mask.push({
      type,
      start,
      end: text.length,
      ...(entity === undefined ? {} : { entity }),
    });
  }

  text += markup.slice(last);
  if (/\[\[|\]\]|\{\{|\}\}/.test(text))
    throw new HarnessError("Unbalanced markup");
  return { text, mask, keep };
}

/** The only errors whose message the CLI prints: each is written here and
 * names labels or ids, never text taken from a dataset. */
export class HarnessError extends Error {
  override readonly name = "HarnessError";
}
