# Evaluation

The harness in `evals/` measures what masking leaves exposed. It runs the
same `maskText` the command runs, on an invented home dataset and on three
public synthetic corpora, with the detector on and off, and scores the spans
`maskText` accepted against the annotated text. Grading is programmatic only.

The latest figures are in [`evals/baseline.md`](../evals/baseline.md) and the
run-to-run noise in [`evals/noise.md`](../evals/noise.md).

## What is measured

Every figure is reported per source. The detailed tables break the main ones
down by language, gold type, genre and size. No figure pools sources: they were generated and annotated by different
pipelines, and an average across them would mean nothing.

| Figure | Definition |
|---|---|
| Leaked chars | Gold characters to mask that no accepted span covers, over all gold characters. Overlapping gold counts each character once. The headline figure. |
| Leaked per mention | The same share computed per mention, then averaged, so a long address cannot drown a short name. |
| Mentions fully masked | Mentions with no character left exposed. |
| Entities with every mention masked | Only where the gold names its entities (the home dataset): an entity counts only if all of its mentions are fully masked. |
| Over-masking | Masked characters outside gold and outside ignored regions, over all such characters. It depends on how completely a corpus is annotated: an unannotated name that gets masked counts here. |
| Clean texts touched | Texts with no gold at all in which a character outside every ignored region was masked. |
| Identifiers destroyed | Spans that must survive (UUIDs, ids, timestamps, loopback addresses) touched by a masked span. A hard gate: the home dataset test fails on any. |
| Exact F1 | Typed span F1 with exact boundaries, secondary, for comparison with published figures. A prediction lying wholly inside ignored text is neither right nor wrong. |
| Leaks inside merge-dropped spans | Leaked characters that a semantic span covered before the merge dropped it for overlapping an accepted span, over all leaked characters. It attributes leaks to the merge rule. |
| Type confusion | Mentions whose dominant overlapping span has another type than the gold: a wrong placeholder. Coverage is measured separately, so a confused mention can also leak. |
| Placeholder consistency | Over mentions one span covers whole: pairs of mentions of one entity given different placeholders, and pairs of different entities given the same one, numbered exactly as `applyMasking` numbers them. |

Intervals are 95 % percentile bootstrap intervals, 1,000 resamples of whole
groups (template or document families) with a fixed seed. Group counts are
shown beside them; under two groups no interval is given, and a draw whose
denominator is empty is skipped, so an interval over rare types is
conditional on the draws that contain one. The difference between detector on
and off is bootstrapped on the same resampled groups, over exactly the same
cases, or not at all.

The detector is called with the extension's defaults, one request at a time:
3,500 ms timeout, phone region `FR`. A timeout is a result, reported among the
skip reasons. Texts above 6,000 characters are kept, and reported in their own
size band, because the extension skips the semantic layer for them.

## Data

### Home dataset

`evals/home.ts` holds what the public sets do not test: technical identifiers
that must survive, SIREN and SIRET with and without a keyword, an `@mention`
followed by the lone first name, particles, names inside emails, texts with no
personal data, astral characters before masked spans, and texts on either side
of the 6,000-character cap. Every value is invented, from the cast in
`AGENTS.md`.

Cases are written with inline markup, so offsets are never counted by hand:

```text
@[[PERSON#a:Camille Rousseau]] relit. [[PERSON#a:Camille]] valide.   to mask, entity a
ecrire a [[EMAIL:marie.dubois@acme-solutions.fr]]                      to mask
user_id={{123456782}}                                                  must survive
```

`evals/home.test.ts` runs in CI. Cases marked `local` run with the semantic
layer disabled and must produce exactly the annotated spans. With a detector
answering on `CAVIARDE_DETECTOR_URL` (default `http://127.0.0.1:5002`), every
case also runs through the live detector and must leak nothing and destroy no
identifier. Cases whose kept values pass Luhn assert that first, so their
survival proves the guard rather than an accident of the check digit.

### External corpora

| Source | Revision | Licence | Fetched from |
|---|---|---|---|
| REDACT | commit `252232ac` | REDACT Dataset Terms v1.0, code MIT | `github.com/guneeshvats/REDACT-PII-Benchmark`, Git LFS |
| Kiji PII training data | `0275550f` | Apache-2.0 | `huggingface.co/datasets/DataikuNLP/kiji-pii-training-data` |
| Gretel synthetic PII finance multilingual | `7b844d16` | Apache-2.0 | `huggingface.co/datasets/gretelai/synthetic_pii_finance_multilingual` |

`pnpm evals fetch` downloads them into a cache outside the repository,
`~/.cache/caviarde-evals` by default or `CAVIARDE_EVAL_CACHE`. A cache inside
the working copy is refused, since `ray publish` ships whatever sits there.
Every file is checked against its sha256 in `evals/sources/pins.ts` on download
and again on every load. REDACT is cloned at its pinned commit and only its
data file is pulled through Git LFS, with the LFS filter configured in that
clone alone. Kiji and Gretel are read as Parquet. No code a dataset ships is
ever executed.

REDACT is used under its terms for the evaluation of a defensive masking tool;
nothing from it is redistributed. It is the work of Guneesh Vats, Anubha
Agrawal, Shikha Singhal, Ajita Dash, Praison Selvaraj, Vidhan Jhawar, Ranga
Prasad Chenna and Bharadwaj Y M G, "REDACT: A Systematically Controlled
Multilingual Benchmark for Personal Information Detection", EMNLP 2026
Industry Track, [arXiv:2606.19881](https://arxiv.org/abs/2606.19881).

### Ingestion

Each source has a label policy in its loader (`evals/sources/*.ts`) that maps
every label it uses to one of Caviarde's types or to an ignored region. A label
the table does not name stops the load. Ignored regions are annotated text
Caviarde does not claim to mask, such as dates, national ids, passwords and
generic tax numbers: neither a leak when exposed nor over-masking when masked.
Some decisions depend on the value:

- gold cards that fail Luhn and gold IBANs that fail mod-97 are ignored, since
  real ones always pass and a generator's invalid ones would measure the
  generator; the issuer prefix Caviarde also requires is not demanded of gold;
- loopback, unspecified and link-local addresses are ignored, matching the
  product rule;
- REDACT mentions marked `disclosed: false` (hypotheticals, templates) and
  obfuscated forms are ignored; partial forms stay in scope;
- a REDACT `Account_Statements` value counts as an IBAN only when it passes
  mod-97.

Every annotation is checked before scoring: integer bounds inside the text,
and the exact annotated string where the source provides one (REDACT and
Kiji; Gretel publishes none). Offsets are read as code points, Python's
convention, and converted once to UTF-16 code units without normalising the
text; REDACT's annotated strings confirm the convention, emoji included.
One failed check quarantines the whole record, never only the annotation:
dropping a single span would turn its sensitive characters into clean text.
Quarantined records and ignored in-scope annotations are counted in the
report.

### Splits and sample

Records are split by group before anything is sampled, 20 % to a final holdout:
REDACT by target pattern, Gretel by document type and subtype, Kiji by record
since it publishes no family key. Records sharing a group never fall on both
sides; the group keys are provenance proxies, not proven duplicate families,
and Kiji has no family separation at all. `pnpm evals sample` draws, per language, 60 development and 60 holdout
records for the claimed languages (en, fr, de, es, pt, it) and Dutch, and 20
for every other language, reported for information only. The ids are pinned in
`evals/manifest.json` with the revision they came from, and a run refuses a
manifest drawn from another revision. The holdout is never run unless
`--split holdout` is given: tuning reads the development split only.

## Running

The detector must be up for anything run with the detector on:
`docker compose up -d`. Its confidence floors are read when it starts
(`assets/detector-patch/gliner_layer.py`), so any configuration change needs a
restart before a run means anything.

```bash
pnpm evals fetch                 # download and verify the pinned corpora
pnpm evals stats                 # counts per source, label and reason, no content
pnpm evals run                   # both modes, development split
pnpm evals run --sources home,redact --modes on
```

Each run writes `environment.json`, `report.md`, `scores.jsonl` and one JSONL
file of details per source and mode under `runs/<timestamp>/` in the cache. Per-case details, including
leaked values, stay there. The repository holds aggregate reports and opaque
record ids only.

### Noise check

`pnpm evals noise` replays a frozen sample, the home dataset and six
development records per source for each claimed language and Dutch (not
stratified by genre), three times with the detector on, and compares the
accepted spans and skip reasons of every pass. It refuses a working copy with
uncommitted changes.

The detector keeps the raw predictions of up to 4,096 text windows in memory
(`_predict_window` in `assets/detector-patch/gliner_layer.py`), so a pass that
repeats one already run normally replays that cache rather than the model,
unless windows were evicted or an abandoned request was still running. The
first pass after a restart runs inference, so comparing first passes across
restarts is the repeatability check; later passes test the cached path. Each
invocation therefore follows a restart, recorded as stated with `--restarted`,
since nothing the detector reports proves it:

```bash
docker compose restart detector  # then wait for /health
pnpm evals noise --restarted
docker compose restart detector
pnpm evals noise --restarted --report evals/noise.md
```

Passes are compared only within the same sample, pipeline commit, `compose.yaml`
and detector patch digests, `/health` answer, detector URL and Node version.
The `/health` answer does not include the floors the container actually
loaded, so the comparison assumes the container was started from this
`compose.yaml`. A difference between two configurations smaller than the
noise measured here is not evidence of anything.

### Recording a baseline

The noise check refuses uncommitted changes, so a baseline is measured on a
committed pipeline and its reports are copied into the repository afterwards,
in a later commit that does not change what was measured:

```bash
docker compose restart detector  # an empty cache, as for new text
pnpm evals run                   # prints the run directory
docker compose restart detector
pnpm evals noise --restarted
docker compose restart detector
pnpm evals noise --restarted
cp ~/.cache/caviarde-evals/runs/<timestamp>/report.md evals/baseline.md
cp ~/.cache/caviarde-evals/noise/report.md evals/noise.md
```

Both reports name the commit they measured.

## Reading the numbers

All three corpora are synthetic and generated by language models, so their
style is more regular than real clipboard text. Gretel's labels were checked
with the GLiNER library, the model family the detector runs, which likely
removed spans GLiNER also misses and flatters semantic recall on that source.
REDACT aligns generated values to the text after the fact, and its quarantined
records carry spans that end past the text. Over-masking on external sources
counts unannotated personal data as clean text. A timeout ends the client's wait,
not necessarily the detector's work: inference runs behind a lock, so the next
request may queue behind an abandoned one, and clustered timeouts are not
independent per-document outcomes. Latencies and timeouts also depend on the
detector's window cache, which is why a baseline starts from a restarted
detector. Exact F1 is computed after the
label policy and with exact boundaries, so it is not directly comparable with
published figures computed under other policies or matching rules.
