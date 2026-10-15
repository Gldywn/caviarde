# Contributing

[AGENTS.md](AGENTS.md) defines the repository's privacy and code invariants.
Examples, fixtures and screenshots use fully invented data. Clipboard text,
detected values, spans and placeholder mappings must never be logged.
Fake secret-shaped fixtures belong only in `src/**/*.test.ts`.

The [architecture](docs/architecture.md) describes the masking pipeline;
the [limitations](docs/limitations.md) record known detection gaps. Suspected
vulnerabilities follow the private reporting instructions in
[SECURITY.md](SECURITY.md).

## Setup

Node and pnpm versions are pinned in `.nvmrc` and `package.json`. From the
repository root, contributor-run setup is:

```bash
mise install
mise exec -- pnpm install --frozen-lockfile
```

`verifyDepsBeforeRun: error` makes checks fail if dependencies are out of sync,
so running a check cannot implicitly install packages.

Raycast on macOS is needed for manual command and UI verification. The unit
tests and static checks do not need a running detector.

## Verification

The CI checks can be run locally from the repository root:

```bash
mise exec -- pnpm test
mise exec -- pnpm evals help
mise exec -- pnpm exec eslint src evals
mise exec -- pnpm exec prettier --check src evals
mise exec -- pnpm run build --output dist --non-interactive
```

The build generates Raycast's preference types before checking TypeScript and
uses an explicit `dist/` output directory. It does not register the
extension in Raycast or publish it. CI runs ESLint and Prettier directly because
`ray lint` also validates Store metadata and rejects `pnpm-lock.yaml` in CI.
`pnpm lint` remains available locally for Raycast's additional extension checks.

Changes to semantic detection, span merging, first-name propagation, technical
identifier preservation, the detector patch or confidence thresholds need tests
against a running detector, including an invented example through the whole
masking pipeline. Mocked responses cannot establish what the model will return.
Threshold, merge or detector changes are also compared with the evaluation
baseline in `evals/baseline.md`, through `pnpm evals run` on the development
split; [docs/evaluation.md](docs/evaluation.md) describes the corpora, the
figures and the noise those comparisons have to exceed.

`src/detection/semantic.integration.test.ts` probes
`http://127.0.0.1:5002/health`. Tests that require the detector skip themselves if
that probe fails; fallback and size-limit tests still run. A green suite with
skips does not verify live detection. CI does not start the detector.

An existing detector started by **Set up Detector** can serve these tests. For
detector patch or threshold work, `docker compose up -d` starts the development
configuration described in [docs/detector-patch.md](docs/detector-patch.md).
Only one detector can bind the same port. An additional development instance
needs a separate Compose project and port:

```bash
CAVIARDE_DETECTOR_PORT=5003 docker compose -p caviarde-dev up -d
CAVIARDE_DETECTOR_URL=http://127.0.0.1:5003 mise exec -- pnpm test
```

For command or UI changes, verification also covers the affected command in
Raycast, using invented clipboard data. Build success alone does not establish
clipboard or UI behavior.

## Adding a deterministic detector

A deterministic detector is a finder, a function from text to spans, listed in
`FINDERS` in `src/detection/deterministic.ts`. National rules live in a module
per country: `src/detection/fr.ts` holds the French ones, and another country
gets a module of the same shape. A new detector touches these places:

1. **Candidate pattern.** A global regex covering the written forms, bounded so
   it cannot start or end inside a longer run, as `(?<!\d)` and `(?!\d)` do for
   digits. `simple()` in `src/detection/finder.ts` turns it into a finder; a
   finder that reads the surrounding text, like `findSiren`, is written out in
   full. A regex called with `test()` stays non-global, since a global one keeps
   its `lastIndex` from one call to the next.
2. **Validator.** The checksum goes in `src/detection/validators/`, as a pure
   function. A checksum alone never qualifies a match: Luhn is one digit, so
   about one arbitrary number in ten passes it. A structural rule comes with
   it, such as an issuer prefix for cards, or a keyword or the spaced form for
   a SIREN. `findSiret` currently breaks this rule: it accepts a bare
   fourteen-digit number on its checksum alone, as `docs/limitations.md`
   records.
3. **Position in `FINDERS`.** The order is behaviour: the first finder to claim
   a range keeps it, and later overlapping matches are dropped. When two
   finders can match the same text, the one whose label should win goes first.
   A business identifier that is Luhn-valid comes before `CARD`, or one
   starting with an issuer prefix is reported as a card; SIRET comes before
   SIREN because a spaced SIRET starts with a SIREN; an international phone
   number comes before all three, because the digits after its `+` can be a
   spaced SIREN or pass the card check.
4. **Entity type.** The type goes in `ENTITY_TYPES` in
   `src/detection/types.ts`. Its name is also the placeholder prefix.
5. **HUD wording.** `NOUNS` in `src/summary.ts` takes the singular and plural,
   and `ORDER` takes the type. TypeScript enforces `NOUNS` but not `ORDER`, and
   a type missing from `ORDER` is left out of the HUD count.
6. **Tests.** `deterministic.test.ts` covers, through `detectDeterministic`, a
   match, a wrong check digit when the format has one, and a value a later
   finder would also accept, such as one passing the card check, which proves
   the position. `summary.test.ts` covers the HUD line. Technical identifiers
   of the same shape go in the home dataset, `evals/home.ts`, as `{{...}}`
   values chosen so they satisfy the checksum and marked `luhn: true`, so that
   `evals/home.test.ts` asserts the checksum before asserting they are left
   alone, with and without the detector. Otherwise the survival test passes
   because the checksum failed, not because the structural rule held.
7. **Documentation.** The detection lists in `README.md` and
   `docs/architecture.md`, and in `docs/limitations.md` what the structural
   rule knowingly lets through.

## Pull requests

The [PR template](.github/PULL_REQUEST_TEMPLATE.md) records the problem, the
resulting behavior, actual verification results and remaining limitations.
Detector-dependent test results distinguish executed tests from skips.
UI changes include screenshots made with invented data. Changed behavior and
known limitations are reflected in the documentation.
