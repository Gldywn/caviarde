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
mise exec -- pnpm exec eslint src
mise exec -- pnpm exec prettier --check src
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

## Pull requests

The [PR template](.github/PULL_REQUEST_TEMPLATE.md) records the problem, the
resulting behavior, actual verification results and remaining limitations.
Detector-dependent test results distinguish executed tests from skips.
UI changes include screenshots made with invented data. Changed behavior and
known limitations are reflected in the documentation.
