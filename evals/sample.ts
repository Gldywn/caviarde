import { createHash } from "node:crypto";
import type { Case } from "./cases";
import { groupBy } from "./metrics";

/** The checkpoint's training languages are claimed, Dutch is measured, and
 * every other language is reported for information only. */
const CLAIMED = ["en", "fr", "de", "es", "pt", "it"];
const MEASURED = ["nl"];

export type Tier = "claimed" | "measured" | "information";

export function tierOf(language: string): Tier {
  const base = language.split("_")[0] ?? language;
  if (CLAIMED.includes(base)) return "claimed";
  if (MEASURED.includes(base)) return "measured";
  return "information";
}

const PER_LANGUAGE: Readonly<Record<Tier, number>> = {
  claimed: 60,
  measured: 60,
  information: 20,
};
const HOLDOUT_SHARE = 0.2;
const NOISE_PER_LANGUAGE = 6;

/** Stable in [0, 1) for a key, so split and order depend on the pinned data
 * alone and a re-draw gives the same manifest. */
function unit(key: string): number {
  return createHash("sha256").update(key).digest().readUInt32BE(0) / 2 ** 32;
}

/** Decided per group before any sampling, so records sharing a group never
 * fall on both sides of the line between tuning data and the final holdout. */
export function splitOf(item: Case): "dev" | "holdout" {
  return unit(`split:${item.source}:${item.group}`) < HOLDOUT_SHARE
    ? "holdout"
    : "dev";
}

export interface SourceSample {
  readonly revision: string;
  readonly dev: string[];
  readonly holdout: string[];
  /** Frozen subset of `dev` replayed by the noise check. */
  readonly noise: string[];
}

export function drawSample(
  cases: readonly Case[],
  revision: string,
): SourceSample {
  const byLanguage = groupBy(cases, (item) => item.language);
  const sample: SourceSample = { revision, dev: [], holdout: [], noise: [] };
  for (const [language, items] of [...byLanguage].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const size = PER_LANGUAGE[tierOf(language)];
    const ordered = items
      .map((item) => ({ item, order: unit(`order:${item.id}`) }))
      .sort((a, b) => a.order - b.order)
      .map(({ item }) => item);
    const dev = ordered.filter((item) => splitOf(item) === "dev");
    const holdout = ordered.filter((item) => splitOf(item) === "holdout");

    sample.dev.push(...dev.slice(0, size).map((item) => item.id));
    sample.holdout.push(...holdout.slice(0, size).map((item) => item.id));
    if (tierOf(language) !== "information")
      sample.noise.push(
        ...dev.slice(0, NOISE_PER_LANGUAGE).map((item) => item.id),
      );
  }
  return sample;
}
