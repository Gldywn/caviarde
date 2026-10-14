import type { EntityType, Span } from "./types";

export type Finder = (text: string) => Span[];

export function simple(
  type: EntityType,
  pattern: RegExp,
  accept?: (match: string) => boolean,
): Finder {
  return (text) => {
    const found: Span[] = [];
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      if (accept && !accept(match[0])) continue;
      found.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        layer: "deterministic",
      });
    }
    return found;
  };
}
