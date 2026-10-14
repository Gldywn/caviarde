import { createHash } from "node:crypto";
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { type Case, HarnessError } from "./cases";
import { HOME_CASES } from "./home";
import { renderReport, type SourceIngestion } from "./report";
import {
  type CaseRecord,
  describeEnvironment,
  type Mode,
  runCases,
} from "./run";
import { drawSample, type SourceSample } from "./sample";
import { cacheDir, cloneAtCommit, fetchPinned } from "./sources/fetch";
import { loadGretel } from "./sources/gretel";
import { loadKiji } from "./sources/kiji";
import { GRETEL, KIJI, REDACT } from "./sources/pins";
import type { Loaded } from "./sources/policy";
import { loadRedact } from "./sources/redact";

const MANIFEST = "evals/manifest.json";

const EXTERNAL: Readonly<
  Record<
    string,
    {
      revision: string;
      groupNote: string;
      load: (root: string) => Promise<Loaded>;
    }
  >
> = {
  redact: {
    revision: REDACT.commit,
    groupNote: "target pattern",
    load: loadRedact,
  },
  kiji: {
    revision: KIJI.revision,
    groupNote: "record (no family key published)",
    load: loadKiji,
  },
  gretel: {
    revision: GRETEL.revision,
    groupNote: "document type and subtype",
    load: loadGretel,
  },
};

type Manifest = Record<string, SourceSample>;

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function progress(message: string): void {
  process.stderr.write(`${message}\n`);
}

async function fetchAll(): Promise<void> {
  const root = cacheDir();
  await cloneAtCommit(
    REDACT.repo,
    REDACT.commit,
    join(root, REDACT.name),
    REDACT.lfsPaths,
  );
  for (const source of [KIJI, GRETEL]) {
    for (const file of source.files) {
      await fetchPinned(
        `https://huggingface.co/datasets/${source.dataset}/resolve/${source.revision}/${file.path}`,
        join(root, source.name, file.path),
        file.sha256,
      );
    }
  }
}

function tally(counts: ReadonlyMap<string, number>): string {
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, n]) => `${key}=${n}`)
    .join(" ");
}

function countBy(keys: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

/** Counts only, so label policies can be reviewed without printing content. */
async function stats(): Promise<void> {
  for (const [name, source] of Object.entries(EXTERNAL)) {
    const { cases, quarantined, excluded, total } =
      await source.load(cacheDir());
    console.log(`\n## ${name}: ${total} records, ${cases.length} loaded`);
    console.log(`quarantined: ${tally(quarantined)}`);
    console.log(`in-scope gold ignored: ${tally(excluded)}`);
    console.log(`languages: ${tally(countBy(cases.map((c) => c.language)))}`);
    console.log(
      `mask: ${tally(countBy(cases.flatMap((c) => c.mask.map((m) => m.type))))}`,
    );
    console.log(`ignored regions: ${cases.flatMap((c) => c.ignore).length}`);
    console.log(`groups: ${new Set(cases.map((c) => c.group)).size}`);
  }
}

async function sample(): Promise<void> {
  const manifest: Manifest = {};
  for (const [name, source] of Object.entries(EXTERNAL)) {
    const { cases } = await source.load(cacheDir());
    manifest[name] = drawSample(cases, source.revision);
  }
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function readManifest(): Promise<Manifest> {
  return JSON.parse(await readFile(MANIFEST, "utf8")) as Manifest;
}

/** Refuses a manifest drawn from other data: its ids would point elsewhere. */
async function selectCases(
  sources: readonly string[],
  pick: (sample: SourceSample) => readonly string[],
  ingestion: Map<string, SourceIngestion>,
): Promise<Map<string, Case[]>> {
  const manifest = await readManifest();
  const selected = new Map<string, Case[]>();
  for (const name of sources) {
    if (name === "home") {
      selected.set(name, [...HOME_CASES]);
      ingestion.set(name, {
        total: HOME_CASES.length,
        quarantined: new Map(),
        excluded: new Map(),
        groupNote: "case",
      });
      continue;
    }
    const source = EXTERNAL[name];
    const pinned = manifest[name];
    if (source === undefined || pinned === undefined)
      throw new HarnessError(`Unknown source: ${name}`);
    if (pinned.revision !== source.revision)
      throw new HarnessError(
        `${MANIFEST} was drawn from another ${name} revision`,
      );

    const loaded = await source.load(cacheDir());
    const byId = new Map(loaded.cases.map((item) => [item.id, item]));
    const ids = pick(pinned);
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0)
      throw new HarnessError(
        `${missing.length} pinned ${name} ids are missing`,
      );
    selected.set(
      name,
      ids.map((id) => byId.get(id) as Case),
    );
    ingestion.set(name, {
      total: loaded.total,
      quarantined: loaded.quarantined,
      excluded: loaded.excluded,
      groupNote: source.groupNote,
    });
  }
  return selected;
}

const OPTIONS = {
  split: { type: "string", default: "dev" },
  sources: { type: "string", default: "home,redact,kiji,gretel" },
  modes: { type: "string", default: "off,on" },
  report: { type: "string" },
  repeat: { type: "string", default: "3" },
  restarted: { type: "boolean", default: false },
} as const;

function detectorUrl(): string {
  return process.env.CAVIARDE_DETECTOR_URL ?? "http://127.0.0.1:5002";
}

function parseModes(raw: string): Mode[] {
  const modes = raw.split(",");
  if (
    modes.length === 0 ||
    new Set(modes).size !== modes.length ||
    !modes.every((mode) => mode === "on" || mode === "off")
  )
    throw new HarnessError("--modes takes on, off or both, once each");
  return modes as Mode[];
}

async function evaluate(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: OPTIONS });
  const split = values.split;
  if (split !== "dev" && split !== "holdout")
    throw new HarnessError("--split is dev or holdout");
  const modes = parseModes(values.modes);
  const baseUrl = detectorUrl();

  const environment = await describeEnvironment(baseUrl);
  if (modes.includes("on") && environment.detector === null)
    throw new HarnessError(`No detector answers at ${baseUrl}/health`);

  const ingestion = new Map<string, SourceIngestion>();
  const selected = await selectCases(
    values.sources.split(","),
    (sample) => (split === "dev" ? sample.dev : sample.holdout),
    ingestion,
  );

  const dir = join(cacheDir(), "runs", stamp());
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "environment.json"),
    JSON.stringify({ ...environment, split, modes }, null, 2),
  );

  const records: CaseRecord[] = [];
  for (const mode of modes) {
    for (const [source, cases] of selected) {
      const details = join(dir, `${source}-${mode}.jsonl`);
      await runCases(cases, mode, baseUrl, async (record, detail) => {
        records.push(record);
        await appendFile(details, `${JSON.stringify(detail)}\n`);
        await appendFile(
          join(dir, "scores.jsonl"),
          `${JSON.stringify(record)}\n`,
        );
        if ((record.order + 1) % 100 === 0)
          progress(`${source} ${mode} ${record.order + 1}/${cases.length}`);
      });
      progress(`${source} ${mode} done`);
    }
  }

  const report = renderReport({
    title: "Evaluation report",
    environment,
    split,
    revisions: {
      home: "in repository",
      redact: REDACT.commit.slice(0, 12),
      kiji: KIJI.revision.slice(0, 12),
      gretel: GRETEL.revision.slice(0, 12),
    },
    ingestion,
    records,
  });
  await writeFile(join(dir, "report.md"), report);
  if (values.report) await writeFile(values.report, report);
  progress(`Run written to ${dir}`);
}

interface NoisePass {
  readonly fingerprints: Record<string, string>;
  readonly skipped: Record<string, string | null>;
  readonly ms: Record<string, number>;
}

interface NoiseInvocation {
  readonly startedAt: string;
  /** Stated by whoever ran it: nothing the detector reports proves a restart. */
  readonly restarted: boolean;
  readonly environment: Record<string, unknown>;
  readonly sample: string;
  readonly passes: NoisePass[];
}

/** A dirty tree is refused upstream, so equal commits mean equal code. */
const COMPARED = [
  "pipeline",
  "compose",
  "detectorPatch",
  "detector",
  "detectorUrl",
  "node",
] as const;

function comparable(a: NoiseInvocation, b: NoiseInvocation): boolean {
  return (
    a.sample === b.sample &&
    COMPARED.every(
      (key) =>
        JSON.stringify(a.environment[key]) ===
        JSON.stringify(b.environment[key]),
    )
  );
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
  );
}

/** Replays a frozen sample: differences between passes are run noise, which
 * no threshold comparison may be read inside of. */
async function noise(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: OPTIONS });
  const repeat = Number(values.repeat);
  if (!Number.isInteger(repeat) || repeat < 2)
    throw new HarnessError("--repeat needs at least two passes");
  const baseUrl = detectorUrl();
  const environment = await describeEnvironment(baseUrl);
  if (environment.dirty)
    throw new HarnessError("Commit first: a dirty tree is not comparable");
  if (environment.detector === null)
    throw new HarnessError(`No detector answers at ${baseUrl}/health`);

  const selected = await selectCases(
    ["home", ...Object.keys(EXTERNAL)],
    (sample) => sample.noise,
    new Map(),
  );
  const cases = [...selected.values()].flat();
  const sampleDigest = createHash("sha256")
    .update(cases.map((c) => c.id).join("\n"))
    .digest("hex")
    .slice(0, 12);

  const startedAt = new Date().toISOString();
  const passes: NoisePass[] = [];
  for (let pass = 0; pass < repeat; pass++) {
    const current: NoisePass = { fingerprints: {}, skipped: {}, ms: {} };
    await runCases(cases, "on", baseUrl, async (_, detail) => {
      current.fingerprints[detail.id] = createHash("sha256")
        .update(JSON.stringify([detail.spans, detail.skipped]))
        .digest("hex")
        .slice(0, 16);
      current.skipped[detail.id] = detail.skipped;
      current.ms[detail.id] = detail.ms;
    });
    passes.push(current);
    progress(`noise pass ${pass + 1}/${repeat} done`);
  }

  const dir = join(cacheDir(), "noise");
  await mkdir(dir, { recursive: true });
  const invocation: NoiseInvocation = {
    startedAt,
    restarted: values.restarted,
    environment,
    sample: sampleDigest,
    passes,
  };
  await writeFile(join(dir, `${stamp()}.json`), JSON.stringify(invocation));

  const invocations: NoiseInvocation[] = [];
  for (const name of (await readdir(dir)).sort())
    if (name.endsWith(".json")) {
      const earlier = JSON.parse(
        await readFile(join(dir, name), "utf8"),
      ) as NoiseInvocation;
      if (comparable(earlier, invocation)) invocations.push(earlier);
    }

  const report = renderNoise(invocations, cases, invocation);
  await writeFile(join(dir, "report.md"), report);
  if (values.report) await writeFile(values.report, report);
  else console.log(report);
}

function renderNoise(
  invocations: readonly NoiseInvocation[],
  cases: readonly Case[],
  latest: NoiseInvocation,
): string {
  const all = invocations.flatMap((invocation, i) =>
    invocation.passes.map((pass, p) => ({ invocation, i, p, data: pass })),
  );
  const unstable = (within: boolean) =>
    cases.filter((item) => {
      const groups = within
        ? invocations.map((invocation) =>
            invocation.passes.map((pass) => pass.fingerprints[item.id]),
          )
        : [all.map((entry) => entry.data.fingerprints[item.id])];
      return groups.some((prints) => new Set(prints).size > 1);
    });
  const firstPassChanges = cases.filter(
    (item) =>
      new Set(
        invocations.map(
          (invocation) => invocation.passes[0]?.fingerprints[item.id],
        ),
      ).size > 1,
  );
  const skipChanges = cases.filter(
    (item) => new Set(all.map((entry) => entry.data.skipped[item.id])).size > 1,
  );
  const bySource = (list: readonly Case[]) =>
    tally(countBy(list.map((item) => item.source))) || "none";

  const rows = all.map(({ invocation, i, p, data }) => {
    const ms = cases.map((item) => data.ms[item.id] ?? 0);
    return (
      `| ${i + 1} | ${invocation.startedAt} | ${invocation.restarted ? "yes" : "no"} ` +
      `| ${p + 1} | ${Math.round(ms[0] ?? 0)} | ${Math.round(quantile(ms, 0.5))} ` +
      `| ${Math.round(quantile(ms, 0.95))} |`
    );
  });

  const env = latest.environment;
  return [
    "# Noise check\n",
    `Pipeline \`${String(env.pipeline)}\`, detector ` +
      `\`${JSON.stringify(env.detector)}\` at \`${String(env.detectorUrl)}\`, ` +
      `compose.yaml \`${String(env.compose)}\`, detector patch ` +
      `\`${String(env.detectorPatch)}\`, Node ${String(env.node)}, sample ` +
      `\`${latest.sample}\`. The loaded confidence floors are not reported by ` +
      "the detector: the comparison assumes the container was started from " +
      "this compose.yaml.\n",
    `${cases.length} frozen cases: the home dataset and the \`noise\` ids of ` +
      `\`${MANIFEST}\`, six development records per source for each claimed ` +
      "language and Dutch, not stratified by genre. " +
      `${invocations.length} invocations, ${all.length} passes. A case is ` +
      "unstable when its accepted spans or its skip reason differ between " +
      "passes. A restart is as stated by whoever ran the invocation. The " +
      "detector caches inference per text window, so passes after the first " +
      "in an invocation normally replay that cache: first passes compared " +
      "across restarts test the model, later passes the cached path.\n",
    `- First passes differing across invocations: ${firstPassChanges.length} (${bySource(firstPassChanges)})`,
    `- Unstable within one invocation: ${unstable(true).length} (${bySource(unstable(true))})`,
    `- Unstable across all passes: ${unstable(false).length} (${bySource(unstable(false))})`,
    `- Skip reason changed: ${skipChanges.length} (${bySource(skipChanges)})\n`,
    "| Invocation | Started | Detector restarted before | Pass | First request ms | Median ms | p95 ms |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "fetch") return fetchAll();
  if (command === "stats") return stats();
  if (command === "sample") return sample();
  if (command === "run") return evaluate(args);
  if (command === "noise") return noise(args);
  throw new HarnessError(
    "Usage: pnpm evals fetch | stats | sample | run [--split dev|holdout] " +
      "[--sources home,redact,kiji,gretel] [--modes off,on] [--report file] " +
      "| noise [--repeat 3] [--restarted] [--report file]",
  );
}

/** Only messages this harness wrote are printed: a parser's message can
 * quote the dataset text that broke it. */
main().catch((error: unknown) => {
  process.exitCode = 1;
  if (error instanceof HarnessError) console.error(error.message);
  else if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    console.error(`${error.name}${typeof code === "string" ? ` ${code}` : ""}`);
  } else console.error("Unknown error");
});
