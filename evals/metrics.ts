import { HarnessError } from "./cases";
import type { CaseScore } from "./score";

/** Null when the denominator is empty: an unavailable figure, never a zero. */
export type Metric = (scores: readonly CaseScore[]) => number | null;

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function sum(
  scores: readonly CaseScore[],
  pick: (score: CaseScore) => number,
): number {
  let total = 0;
  for (const score of scores) total += pick(score);
  return total;
}

export const leakMicro: Metric = (s) =>
  ratio(
    sum(s, (x) => x.leaked),
    sum(s, (x) => x.sensitive),
  );

/** Each mention weighs the same, so a long address cannot drown a short name. */
export const leakMacro: Metric = (s) => {
  let total = 0;
  let count = 0;
  for (const score of s)
    for (const mention of score.mentions) {
      total += mention.leaked / mention.length;
      count++;
    }
  return ratio(total, count);
};

export const mentionCoverage: Metric = (s) => {
  let covered = 0;
  let count = 0;
  for (const score of s)
    for (const mention of score.mentions) {
      if (mention.leaked === 0) covered++;
      count++;
    }
  return ratio(covered, count);
};

export const entityRecall: Metric = (s) =>
  ratio(
    sum(s, (x) => x.entities.protected),
    sum(s, (x) => x.entities.total),
  );

export const overMasking: Metric = (s) =>
  ratio(
    sum(s, (x) => x.overMasked),
    sum(s, (x) => x.clean),
  );

/** Share of texts with no gold at all in which a clean character was masked;
 * a span that also touches an ignored region still counts. */
export const cleanTouched: Metric = (s) => {
  const clean = s.filter((x) => x.mentions.length === 0);
  return ratio(clean.filter((x) => x.overMasked > 0).length, clean.length);
};

export const identifierLoss: Metric = (s) =>
  ratio(
    sum(s, (x) => x.keep.destroyed),
    sum(s, (x) => x.keep.total),
  );

export const exactF1: Metric = (s) => {
  const tp = sum(s, (x) => x.exact.tp);
  return ratio(
    2 * tp,
    2 * tp + sum(s, (x) => x.exact.fp) + sum(s, (x) => x.exact.fn),
  );
};

export const mergeShare: Metric = (s) =>
  ratio(
    sum(s, (x) => x.mergeLeaked),
    sum(s, (x) => x.leaked),
  );

export const ignoredShare: Metric = (s) =>
  ratio(
    sum(s, (x) => x.ignored),
    sum(s, (x) => x.length),
  );

/** mulberry32: seeded, so a report is reproducible from the same run. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESAMPLES = 1000;

export function groupBy<T>(
  items: Iterable<T>,
  key: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item));
    if (list) list.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

function byGroup(scores: readonly CaseScore[]): Map<string, CaseScore[]> {
  return groupBy(scores, (score) => score.group);
}

function percentiles(values: number[]): [number, number] | null {
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const at = (q: number) =>
    values[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 0;
  return [at(0.025), at(0.975)];
}

/** Resampled by group, not by case or character: cases of one template are
 * not independent evidence. Null under two groups, where resampling has
 * nothing to vary. Draws whose denominator is empty are skipped. */
export function interval(
  scores: readonly CaseScore[],
  metric: Metric,
): [number, number] | null {
  const groups = [...byGroup(scores).values()];
  if (groups.length < 2) return null;
  const next = random(1);
  const values: number[] = [];
  for (let b = 0; b < RESAMPLES; b++) {
    const drawn: CaseScore[] = [];
    for (let i = 0; i < groups.length; i++)
      drawn.push(...(groups[Math.floor(next() * groups.length)] ?? []));
    const value = metric(drawn);
    if (value !== null) values.push(value);
  }
  return percentiles(values);
}

/** Both modes see the same resampled groups, so the interval is on the
 * difference itself rather than on two independent figures. */
export function pairedInterval(
  on: readonly CaseScore[],
  off: readonly CaseScore[],
  metric: Metric,
): [number, number] | null {
  const identity = (scores: readonly CaseScore[]) =>
    scores.map((s) => JSON.stringify([s.source, s.id, s.group])).sort();
  const a = identity(on);
  const z = identity(off);
  if (
    new Set(a).size !== a.length ||
    a.length !== z.length ||
    a.some((key, i) => key !== z[i])
  )
    throw new HarnessError("A paired comparison needs the same cases twice");

  const onGroups = byGroup(on);
  const offGroups = byGroup(off);
  const keys = [...onGroups.keys()];
  if (keys.length < 2) return null;
  const next = random(2);
  const values: number[] = [];
  for (let b = 0; b < RESAMPLES; b++) {
    const drawnOn: CaseScore[] = [];
    const drawnOff: CaseScore[] = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[Math.floor(next() * keys.length)] ?? "";
      drawnOn.push(...(onGroups.get(key) ?? []));
      drawnOff.push(...(offGroups.get(key) ?? []));
    }
    const left = metric(drawnOn);
    const right = metric(drawnOff);
    if (left !== null && right !== null) values.push(left - right);
  }
  return percentiles(values);
}
