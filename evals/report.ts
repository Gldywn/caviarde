import { SEMANTIC_MAX_CHARS } from "../src/detection/semantic";
import {
  cleanTouched,
  entityRecall,
  exactF1,
  groupBy,
  identifierLoss,
  ignoredShare,
  interval,
  leakMacro,
  leakMicro,
  type Metric,
  mentionCoverage,
  mergeShare,
  overMasking,
  pairedInterval,
} from "./metrics";
import type { CaseRecord, Mode } from "./run";
import { tierOf } from "./sample";
import type { CaseScore } from "./score";

export interface SourceIngestion {
  readonly total: number;
  readonly quarantined: ReadonlyMap<string, number>;
  readonly excluded: ReadonlyMap<string, number>;
  readonly groupNote: string;
}

export interface Summary {
  readonly title: string;
  readonly environment: Record<string, unknown>;
  readonly split: string;
  readonly revisions: Readonly<Record<string, string>>;
  readonly ingestion: ReadonlyMap<string, SourceIngestion>;
  readonly records: readonly CaseRecord[];
}

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)} %`;
}

function withInterval(scores: readonly CaseScore[], metric: Metric): string {
  const value = metric(scores);
  if (value === null) return pct(value);
  const bounds = interval(scores, metric);
  return bounds === null
    ? `${pct(value)}, one group`
    : `${pct(value)} [${pct(bounds[0])}, ${pct(bounds[1])}]`;
}

function groupCount(scores: readonly CaseScore[]): string {
  return String(new Set(scores.map((s) => s.group)).size);
}

function table(header: readonly string[], rows: readonly string[][]): string {
  return [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function count(map: ReadonlyMap<string, number>): string {
  return map.size === 0
    ? "none"
    : [...map]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, n]) => `${key} ${n}`)
        .join(", ");
}

const MODES: readonly Mode[] = ["on", "off"];
const LABEL: Readonly<Record<Mode, string>> = {
  on: "detector on",
  off: "detector off",
};

function byMode(records: readonly CaseRecord[], mode: Mode): CaseScore[] {
  return records.filter((r) => r.mode === mode).map((r) => r.score);
}

/** Characters of each gold type left unmasked, over that type's mentions. */
function typeLeak(scores: readonly CaseScore[], type: string): number | null {
  let leaked = 0;
  let length = 0;
  for (const score of scores)
    for (const mention of score.mentions)
      if (mention.type === type) {
        leaked += mention.leaked;
        length += mention.length;
      }
  return length === 0 ? null : leaked / length;
}

function typeCoverage(
  scores: readonly CaseScore[],
  type: string,
): number | null {
  const mentions = scores.flatMap((s) =>
    s.mentions.filter((m) => m.type === type),
  );
  return mentions.length === 0
    ? null
    : mentions.filter((m) => m.leaked === 0).length / mentions.length;
}

function headline(source: string, records: readonly CaseRecord[]): string {
  const rows = MODES.flatMap((mode) => {
    const scores = byMode(records, mode);
    if (scores.length === 0) return [];
    const skipped = groupBy(
      scores.filter((s) => s.skipped !== null && s.skipped !== "disabled"),
      (s) => s.skipped ?? "",
    );
    return [
      [
        LABEL[mode],
        String(scores.length),
        groupCount(scores),
        withInterval(scores, leakMicro),
        withInterval(scores, leakMacro),
        withInterval(scores, mentionCoverage),
        withInterval(scores, overMasking),
        pct(cleanTouched(scores)),
        pct(identifierLoss(scores)),
        pct(exactF1(scores)),
        pct(mergeShare(scores)),
        count(new Map([...skipped].map(([k, v]) => [k, v.length]))),
      ],
    ];
  });

  const on = byMode(records, "on");
  const off = byMode(records, "off");
  const paired =
    on.length > 0 && off.length > 0 ? pairedInterval(on, off, leakMicro) : null;
  const difference =
    paired === null
      ? ""
      : `\n\nLeaked characters, detector on minus off: ${pct(
          (leakMicro(on) ?? 0) - (leakMicro(off) ?? 0),
        )} [${pct(paired[0])}, ${pct(paired[1])}], paired by group.`;

  return (
    `### ${source}\n\n` +
    table(
      [
        "Mode",
        "Cases",
        "Groups",
        "Leaked chars",
        "Leaked per mention",
        "Mentions fully masked",
        "Over-masking",
        "Clean texts touched",
        "Identifiers destroyed",
        "Exact F1",
        "Leaks inside merge-dropped spans",
        "Semantic skipped",
      ],
      rows,
    ) +
    difference
  );
}

function languages(source: string, records: readonly CaseRecord[]): string {
  const on = groupBy(byMode(records, "on"), (s) => s.language);
  const off = groupBy(byMode(records, "off"), (s) => s.language);
  const order = { claimed: 0, measured: 1, information: 2 };
  const rows = [...new Set([...on.keys(), ...off.keys()])]
    .sort((a, b) => order[tierOf(a)] - order[tierOf(b)] || a.localeCompare(b))
    .map((language) => {
      const a = on.get(language) ?? [];
      const z = off.get(language) ?? [];
      return [
        language,
        tierOf(language),
        String(Math.max(a.length, z.length)),
        groupCount(a.length > 0 ? a : z),
        withInterval(a, leakMicro),
        withInterval(z, leakMicro),
        pct(mentionCoverage(a)),
        pct(mentionCoverage(z)),
        pct(overMasking(a)),
      ];
    });
  return (
    `### ${source}\n\n` +
    table(
      [
        "Language",
        "Tier",
        "Cases",
        "Groups",
        "Leaked chars, on",
        "Leaked chars, off",
        "Fully masked, on",
        "Fully masked, off",
        "Over-masking, on",
      ],
      rows,
    )
  );
}

function types(source: string, records: readonly CaseRecord[]): string {
  const on = byMode(records, "on");
  const off = byMode(records, "off");
  const all = [...new Set([...on, ...off].flatMap((s) => s.mentions))];
  const names = [...new Set(all.map((m) => m.type))].sort();
  const rows = names.map((type) => [
    type,
    String(
      (on.length > 0 ? on : off).flatMap((s) =>
        s.mentions.filter((m) => m.type === type),
      ).length,
    ),
    pct(typeLeak(on, type)),
    pct(typeLeak(off, type)),
    pct(typeCoverage(on, type)),
    pct(typeCoverage(off, type)),
  ]);
  return (
    `### ${source}\n\n` +
    table(
      [
        "Type",
        "Mentions",
        "Leaked chars, on",
        "Leaked chars, off",
        "Fully masked, on",
        "Fully masked, off",
      ],
      rows,
    )
  );
}

const MIN_GENRE_CASES = 10;

function genres(source: string, records: readonly CaseRecord[]): string {
  const on = groupBy(byMode(records, "on"), (s) => s.genre);
  const off = groupBy(byMode(records, "off"), (s) => s.genre);
  const keys = [...new Set([...on.keys(), ...off.keys()])].sort();
  const shown = keys.filter(
    (genre) =>
      Math.max(on.get(genre)?.length ?? 0, off.get(genre)?.length ?? 0) >=
      MIN_GENRE_CASES,
  );
  if (shown.length === 0) return "";
  const rows = shown.map((genre) => {
    const a = on.get(genre) ?? [];
    const z = off.get(genre) ?? [];
    return [
      genre,
      String(Math.max(a.length, z.length)),
      pct(leakMicro(a)),
      pct(leakMicro(z)),
      pct(overMasking(a)),
    ];
  });
  const hidden = keys.length - shown.length;
  return (
    `### ${source}\n\n` +
    table(
      [
        "Genre",
        "Cases",
        "Leaked chars, on",
        "Leaked chars, off",
        "Over-masking, on",
      ],
      rows,
    ) +
    (hidden > 0
      ? `\n\nNot listed, under ${MIN_GENRE_CASES} cases each: ${hidden} genre${hidden === 1 ? "" : "s"}.`
      : "")
  );
}

function sizes(source: string, records: readonly CaseRecord[]): string {
  const band = (s: CaseScore) =>
    s.length > SEMANTIC_MAX_CHARS
      ? `over ${SEMANTIC_MAX_CHARS}`
      : `up to ${SEMANTIC_MAX_CHARS}`;
  const on = groupBy(byMode(records, "on"), band);
  const off = groupBy(byMode(records, "off"), band);
  const rows = [...new Set([...on.keys(), ...off.keys()])]
    .sort()
    .map((key) => [
      key,
      String(Math.max(on.get(key)?.length ?? 0, off.get(key)?.length ?? 0)),
      pct(leakMicro(on.get(key) ?? [])),
      pct(leakMicro(off.get(key) ?? [])),
    ]);
  return (
    `### ${source}\n\n` +
    table(
      ["Characters", "Cases", "Leaked chars, on", "Leaked chars, off"],
      rows,
    )
  );
}

const MAX_CONFUSIONS = 12;

function confusions(source: string, records: readonly CaseRecord[]): string {
  const pairs = new Map<string, number>();
  for (const score of byMode(records, "on"))
    for (const mention of score.mentions)
      if (mention.predicted !== null && mention.predicted !== mention.type) {
        const key = `${mention.type} → ${mention.predicted}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
  if (pairs.size === 0) return "";
  const rows = [...pairs]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, MAX_CONFUSIONS)
    .map(([key, n]) => [key, String(n)]);
  return `### ${source}\n\n` + table(["Gold → masked as", "Mentions"], rows);
}

function consistency(source: string, records: readonly CaseRecord[]): string {
  const rows = MODES.flatMap((mode) => {
    const scores = byMode(records, mode);
    const same = scores.reduce((t, s) => t + s.placeholders.samePairs, 0);
    const distinct = scores.reduce(
      (t, s) => t + s.placeholders.distinctPairs,
      0,
    );
    const entities = scores.reduce((t, s) => t + s.entities.total, 0);
    if (entities + same + distinct === 0) return [];
    const split = scores.reduce((t, s) => t + s.placeholders.split, 0);
    const merged = scores.reduce((t, s) => t + s.placeholders.merged, 0);
    return [
      [
        LABEL[mode],
        pct(entityRecall(scores)),
        same === 0 ? "n/a" : `${split} of ${same}`,
        distinct === 0 ? "n/a" : `${merged} of ${distinct}`,
      ],
    ];
  });
  if (rows.length === 0) return "";
  return (
    `### ${source}\n\n` +
    table(
      [
        "Mode",
        "Entities with every mention masked",
        "Same entity, different placeholders",
        "Different entities, same placeholder",
      ],
      rows,
    )
  );
}

function ingestion(summary: Summary): string {
  const rows = [...summary.ingestion].map(([source, info]) => {
    const scores = summary.records
      .filter((r) => r.score.source === source)
      .map((r) => r.score);
    const distinct = new Map(scores.map((s) => [s.id, s]));
    return [
      source,
      summary.revisions[source] ?? "",
      String(info.total),
      count(info.quarantined),
      count(info.excluded),
      String(distinct.size),
      String(new Set([...distinct.values()].map((s) => s.group)).size),
      pct(ignoredShare([...distinct.values()])),
      info.groupNote,
    ];
  });
  return table(
    [
      "Source",
      "Revision",
      "Records",
      "Quarantined",
      "In-scope gold ignored",
      "Cases run",
      "Groups",
      "Ignored chars",
      "Group key",
    ],
    rows,
  );
}

const COMPARED_METRICS: ReadonlyArray<[string, Metric]> = [
  ["Leaked chars", leakMicro],
  ["Leaked per mention", leakMacro],
  ["Over-masking", overMasking],
];

/** Paired by group over the cases neither run timed out on. Each run's skips
 * are listed apart, so a slower configuration or a detector that went away
 * still shows. */
export function renderComparison(
  candidate: readonly CaseRecord[],
  reference: readonly CaseRecord[],
): string {
  const key = (s: CaseScore) => JSON.stringify([s.source, s.id]);
  const late = (records: readonly CaseRecord[]) =>
    byMode(records, "on").filter((s) => s.skipped === "timeout");
  const timedOut = new Map(
    [...late(candidate), ...late(reference)].map((s) => [key(s), s]),
  );
  const tally = (scores: Iterable<CaseScore>, by: (s: CaseScore) => string) =>
    count(new Map([...groupBy(scores, by)].map(([k, v]) => [k, v.length])));
  // Oversized texts are skipped identically in both runs, so they say nothing.
  const skips = (records: readonly CaseRecord[]) =>
    tally(
      byMode(records, "on").filter(
        (s) => s.skipped !== null && s.skipped !== "too-large",
      ),
      (s) => `${s.source} ${s.skipped}`,
    );
  const answered = (records: readonly CaseRecord[]) =>
    groupBy(
      byMode(records, "on").filter((s) => !timedOut.has(key(s))),
      (s) => s.source,
    );
  const a = answered(candidate);
  const z = answered(reference);
  const rows = [...new Set([...a.keys(), ...z.keys()])].flatMap((source) =>
    COMPARED_METRICS.map(([name, metric]) => {
      const left = a.get(source) ?? [];
      const right = z.get(source) ?? [];
      const x = metric(left);
      const y = metric(right);
      const bounds = pairedInterval(left, right, metric);
      return [
        source,
        name,
        pct(x),
        pct(y),
        x === null || y === null ? "n/a" : pct(x - y),
        bounds === null ? "n/a" : `[${pct(bounds[0])}, ${pct(bounds[1])}]`,
      ];
    }),
  );
  return (
    table(
      [
        "Source",
        "Figure",
        "Candidate",
        "Reference",
        "Difference",
        "95 % interval",
      ],
      rows,
    ) +
    `\n\nSemantic skipped, candidate: ${skips(candidate)}; reference: ` +
    `${skips(reference)}. Left out of both, timed out in either run: ` +
    `${tally(timedOut.values(), (s) => s.source)}.`
  );
}

/** Aggregates and opaque ids only: per-case details stay in the cache. */
export function renderReport(summary: Summary): string {
  const bySource = groupBy(summary.records, (r) => r.score.source);
  const sources = [...bySource.keys()];
  const section = (
    title: string,
    render: (source: string, records: readonly CaseRecord[]) => string,
    preamble = "",
  ) => {
    const parts = sources
      .map((source) => render(source, bySource.get(source) ?? []))
      .filter((part) => part.length > 0);
    return parts.length === 0
      ? ""
      : `## ${title}\n\n${preamble}${parts.join("\n\n")}\n`;
  };

  const env = summary.environment;
  return [
    `# ${summary.title}\n`,
    `Split \`${summary.split}\`, pipeline \`${String(env.pipeline)}\`` +
      `${env.dirty ? " with uncommitted changes" : ""}, detector ` +
      `\`${JSON.stringify(env.detector)}\`, compose.yaml \`${String(env.compose)}\`, ` +
      `detector patch \`${String(env.detectorPatch)}\`, Node ${String(env.node)}. ` +
      "Metric definitions are in `docs/evaluation.md`. Intervals are 95 % " +
      "bootstrap intervals over groups. Each source is reported on its own; " +
      "no figure pools them.\n",
    section("Per source", headline),
    section("Per language", languages),
    section(
      "Per gold type",
      types,
      "Characters are summed over the mentions of each type, so a character inside two nested mentions counts in both; the per-source figures count it once.\n\n",
    ),
    section("Per genre", genres),
    section("By size", sizes),
    section(
      "Type confusion, detector on",
      confusions,
      "Mentions whose dominant overlapping span has another type than the gold. Coverage is measured separately: a confused mention can also leak.\n\n",
    ),
    section(
      "Placeholder consistency",
      consistency,
      "Only where the gold names its entities. Placeholder pairs are counted over mentions one span covers whole.\n\n",
    ),
    `## Ingestion\n\n${ingestion(summary)}\n`,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}
