import { propagateFirstNames } from "./detection/coreference";
import { detectDeterministic } from "./detection/deterministic";
import { mergeSpans } from "./detection/merge";
import { detectSemantic, type SemanticOptions } from "./detection/semantic";
import type { SemanticSkipReason } from "./detection/types";
import { applyMasking, type MaskingResult } from "./masking/apply";

export interface MaskTextResult extends MaskingResult {
  /** Null when semantic detection succeeded, even with nothing found. */
  readonly semanticSkipped: SemanticSkipReason | null;
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
  const { masked, counts } = applyMasking(text, [
    ...merged,
    ...propagateFirstNames(text, merged),
  ]);

  return {
    masked,
    counts,
    semanticSkipped: semantic.ok ? null : semantic.reason,
  };
}
