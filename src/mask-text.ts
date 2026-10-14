import { propagateFirstNames } from "./detection/coreference";
import { detectDeterministic } from "./detection/deterministic";
import { mergeSpans } from "./detection/merge";
import { detectSemantic, type SemanticOptions } from "./detection/semantic";
import type { SemanticSkipReason, Span } from "./detection/types";
import { applyMasking, type MaskingResult } from "./masking/apply";

export interface MaskTextResult extends MaskingResult {
  /** Null when semantic detection succeeded, even with nothing found. */
  readonly semanticSkipped: SemanticSkipReason | null;
  /** Every masked span in original coordinates, propagated first names
   * included, so a scorer never has to read placeholders back. */
  readonly spans: readonly Span[];
  /** Semantic spans the merge refused for overlapping an accepted one. */
  readonly dropped: readonly Span[];
}

/** The whole pipeline, kept free of @raycast/api so tests and tools run the same
 * composition as the command. */
export async function maskText(
  text: string,
  options: SemanticOptions,
): Promise<MaskTextResult> {
  const spans = [...detectDeterministic(text)];

  const semantic = await detectSemantic(text, options);
  if (semantic.ok) spans.push(...semantic.spans);

  const merged = mergeSpans(spans);
  // Propagated names are disjoint from `merged` and from each other, and
  // applyMasking sorts, so no second merge is needed.
  const accepted = [...merged, ...propagateFirstNames(text, merged)];
  const { masked, counts } = applyMasking(text, accepted);

  return {
    masked,
    counts,
    semanticSkipped: semantic.ok ? null : semantic.reason,
    spans: accepted,
    dropped: semantic.ok
      ? semantic.spans.filter((span) => !merged.includes(span))
      : [],
  };
}
