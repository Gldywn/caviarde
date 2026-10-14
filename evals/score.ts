import type {
  EntityType,
  SemanticSkipReason,
  Span,
} from "../src/detection/types";
import { createPlaceholderAssigner } from "../src/masking/placeholders";
import type { Case, Region } from "./cases";

export interface Prediction {
  readonly spans: readonly Span[];
  readonly dropped: readonly Span[];
  readonly semanticSkipped: SemanticSkipReason | null;
}

export interface MentionScore {
  readonly type: EntityType;
  readonly length: number;
  readonly leaked: number;
  /** Type of the accepted span covering most of the mention. */
  readonly predicted: EntityType | null;
}

export interface CaseScore {
  readonly id: string;
  readonly source: string;
  readonly language: string;
  readonly genre: string;
  readonly group: string;
  readonly length: number;
  readonly skipped: SemanticSkipReason | null;
  readonly sensitive: number;
  readonly leaked: number;
  /** Leaked characters inside a semantic span the merge refused. */
  readonly mergeLeaked: number;
  readonly ignored: number;
  readonly clean: number;
  readonly overMasked: number;
  /** Accepted spans touching neither gold nor an ignored region. */
  readonly falsePositives: number;
  readonly mentions: readonly MentionScore[];
  readonly entities: { readonly total: number; readonly protected: number };
  readonly keep: { readonly total: number; readonly destroyed: number };
  readonly exact: {
    readonly tp: number;
    readonly fp: number;
    readonly fn: number;
  };
  readonly placeholders: {
    readonly samePairs: number;
    readonly split: number;
    readonly distinctPairs: number;
    readonly merged: number;
  };
}

function paint(length: number, regions: readonly Region[]): Uint8Array {
  const marks = new Uint8Array(length);
  for (const { start, end } of regions) marks.fill(1, start, end);
  return marks;
}

export function overlap(a: Region, b: Region): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/** Replays production numbering: the order and the key applyMasking uses. */
export function placeholdersOf(
  text: string,
  spans: readonly Span[],
): Map<Span, string> {
  const assign = createPlaceholderAssigner();
  const result = new Map<Span, string>();
  for (const span of [...spans].sort((a, b) => a.start - b.start))
    result.set(
      span,
      assign(span.type, span.alias ?? text.slice(span.start, span.end)),
    );
  return result;
}

/** Character sets are painted, never summed per span, so overlapping gold or
 * overlapping predictions cannot count a character twice. */
export function scoreCase(item: Case, prediction: Prediction): CaseScore {
  const { text, mask, keep, ignore } = item;
  const { spans, dropped } = prediction;

  const sensitive = paint(text.length, mask);
  const ignoredMarks = paint(text.length, ignore);
  const covered = paint(text.length, spans);
  const refused = paint(text.length, dropped);

  let sensitiveCount = 0;
  let leaked = 0;
  let mergeLeaked = 0;
  let ignored = 0;
  let clean = 0;
  let overMasked = 0;
  for (let i = 0; i < text.length; i++) {
    if (sensitive[i]) {
      sensitiveCount++;
      if (!covered[i]) {
        leaked++;
        if (refused[i]) mergeLeaked++;
      }
    } else if (ignoredMarks[i]) {
      ignored++;
    } else {
      clean++;
      if (covered[i]) overMasked++;
    }
  }

  const mentions = mask.map((gold) => {
    let mentionLeak = 0;
    for (let i = gold.start; i < gold.end; i++) if (!covered[i]) mentionLeak++;
    // Largest overlap, then earliest start, so ties never depend on order.
    let best: Span | null = null;
    for (const span of spans) {
      const size = overlap(span, gold);
      const bestSize = best === null ? 0 : overlap(best, gold);
      if (
        size > bestSize ||
        (size > 0 && size === bestSize && best && span.start < best.start)
      )
        best = span;
    }
    return {
      type: gold.type,
      length: gold.end - gold.start,
      leaked: mentionLeak,
      predicted: best?.type ?? null,
    };
  });

  const entityLeaks = new Map<string, boolean>();
  mask.forEach((gold, index) => {
    if (gold.entity === undefined) return;
    const leaks = (mentions[index]?.leaked ?? 0) > 0;
    entityLeaks.set(
      gold.entity,
      (entityLeaks.get(gold.entity) ?? false) || leaks,
    );
  });

  const gold = new Set(mask.map((g) => `${g.start}:${g.end}:${g.type}`));
  let tp = 0;
  let fp = 0;
  for (const span of spans) {
    if (gold.has(`${span.start}:${span.end}:${span.type}`)) {
      tp++;
      continue;
    }
    // Exempt only when every character is ignored: a span reaching into
    // clean text or scored gold is still a wrong prediction.
    let ignoredOnly = true;
    for (let i = span.start; i < span.end && ignoredOnly; i++)
      ignoredOnly = ignoredMarks[i] === 1 && sensitive[i] === 0;
    if (!ignoredOnly) fp++;
  }

  // Only mentions one span covers whole get a placeholder to compare, so
  // these figures are conditional on full coverage.
  const placeholders = placeholdersOf(text, spans);
  const resolved: Array<{ entity: string; placeholder: string }> = [];
  for (const mention of mask) {
    if (mention.entity === undefined) continue;
    const holder = spans.find(
      (span) => span.start <= mention.start && mention.end <= span.end,
    );
    const placeholder = holder && placeholders.get(holder);
    if (placeholder) resolved.push({ entity: mention.entity, placeholder });
  }
  let samePairs = 0;
  let split = 0;
  let distinctPairs = 0;
  let merged = 0;
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i];
      const b = resolved[j];
      if (a === undefined || b === undefined) continue;
      if (a.entity === b.entity) {
        samePairs++;
        if (a.placeholder !== b.placeholder) split++;
      } else {
        distinctPairs++;
        if (a.placeholder === b.placeholder) merged++;
      }
    }
  }

  return {
    id: item.id,
    source: item.source,
    language: item.language,
    genre: item.genre,
    group: item.group,
    length: text.length,
    skipped: prediction.semanticSkipped,
    sensitive: sensitiveCount,
    leaked,
    mergeLeaked,
    ignored,
    clean,
    overMasked,
    falsePositives: spans.filter(
      (span) =>
        ![...mask, ...ignore].some((region) => overlap(region, span) > 0),
    ).length,
    mentions,
    entities: {
      total: entityLeaks.size,
      protected: [...entityLeaks.values()].filter((leaks) => !leaks).length,
    },
    keep: {
      total: keep.length,
      destroyed: keep.filter((region) =>
        spans.some((span) => overlap(span, region) > 0),
      ).length,
    },
    exact: { tp, fp, fn: gold.size - tp },
    placeholders: { samePairs, split, distinctPairs, merged },
  };
}
