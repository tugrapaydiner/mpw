# Reproducibility

## Reproduction levels

MPW distinguishes four increasingly strong forms of reproduction.

### R1 — source build

A clean checkout installs the locked dependency graph, type-checks, lints, runs automated tests, and produces the browser bundle.

### R2 — deterministic scientific regeneration

The reconciliation benchmark, canonical family analysis, publication/certificate artifacts, and certificate replay are regenerated from source at an identified revision.

### R3 — independent implementation agreement

A second algorithm or implementation agrees on the material result. The branch currently includes independent finite-search oracles and a certificate reference oracle, but these still share the TypeScript runtime and repository.

### R4 — external third-party reproduction

An independent person or team obtains the declared inputs, follows the protocol without private assistance, and reports agreement or disagreement. This remains not yet verified.

A successful R1/R2 run is not described as R4.

## Clean-clone procedure

Requirements:

- Git;
- Node.js 20 or later;
- npm compatible with the committed lockfile;
- no API keys, model service, database, GPU, or browser extension for deterministic tests.

```bash
git clone https://github.com/tugrapaydiner/mpw.git
cd mpw
git checkout research/deep-mpw-overhaul
npm ci
npm run verify
```

Record the exact revision:

```bash
git rev-parse HEAD
```

## Full research reproduction report

After `npm ci`, run:

```bash
npx vite-node scripts/reproduce-research.mts \
  --output artifacts/mpw-reproduction-report.json
```

The script fails on the first nonzero scientific gate. On success it records:

- repository HEAD;
- Node version, platform, and architecture;
- exact command arguments and exit codes;
- bounded stdout/stderr tails;
- SHA-256 and byte length for generated benchmark, family-analysis, certificate, and lockfile artifacts;
- explicit interpretation limitations.

The report intentionally includes environment metadata. Therefore reports from different successful environments need not be byte-identical.

## Commands included in the report

The current reproduction driver runs:

```text
npm run verify
npm run research:benchmark:write
npm run statistics:family:write
npm run certificate:v2:write
npm run verify:certificate -- data/certificates/canonical-v2.json
```

`npm run verify` itself covers type checking, linting, tests, and production build.

## Generated artifact identities

The report hashes:

```text
data/benchmarks/reconciliation-results.json
data/analysis/canonical-family-inference.json
data/certificates/canonical-v2.json
package-lock.json
```

A matching hash establishes matching bytes. A mismatching hash requires investigation; it does not automatically identify which implementation is correct.

## Determinism boundaries

The following are intended to be deterministic when their declared seed and revision are fixed:

- canonical simulator receipts;
- protocol substitution;
- pointwise and synchronized bootstrap outputs;
- exact search order and witness sets;
- canonical JSON bytes and hashes;
- benchmark result artifacts;
- certificate replay.

The following can legitimately vary:

- wall-clock timing;
- operating-system and runtime metadata;
- network installation logs;
- live browser and agent behavior;
- external services or source availability;
- future repeated real-model evaluations unless their randomness is controlled and recorded.

Timing is never included in a scientific content identity unless the study explicitly defines it as an outcome.

## Independent oracle checks

The branch reduces shared-bug risk through:

- exhaustive comparison of exact search with an independent oracle over all 256 Boolean landscapes on three dimensions;
- exhaustive package-to-reconciliation model checking in both directions;
- a certificate reference oracle that independently rebuilds subsets, hybrids, sufficiency, minima, ties, and candidate status;
- certificate evaluator replay;
- deterministic robust-witness Monte Carlo studies with known probabilities.

These checks improve confidence but are not formal verification.

## External data reproduction

For an external static grid, preserve:

- source URL and revision;
- retrieval date;
- license or usage basis;
- raw source checksum;
- transformation code;
- exclusion log;
- typed protocol schema;
- complete endpoint-substitution package;
- reconciliation output;
- software revision.

A derived summary without the raw source identity is insufficient for independent reproduction.

The current five-candidate external study has executed GitHub evidence and a machine-readable summary, but a fully independent third-party reproduction remains pending.

## Live agent and browser reproduction

WebMCP or agent claims require, in addition:

- exact browser and agent/model versions;
- application SHA;
- tool-registration state;
- full prompts;
- arm assignment;
- complete browser/tool traces;
- timeout and failure policy;
- scoring revision.

Mocked registration tests and deterministic handler tests remain R1/R2 evidence only.

## Failure reporting

A reproduction report should preserve:

- first failing command;
- exit code;
- relevant logs;
- runtime and operating system;
- repository state and uncommitted changes;
- whether generated artifacts were stale;
- any network or registry failures.

Do not rerun until green and report only the successful attempt. Failed attempts are useful evidence about reproducibility.

## Supply-chain note

`npm ci` verifies consistency with the lockfile but still retrieves packages from an external registry. Higher-assurance releases should additionally publish an SBOM, dependency provenance, action commit pins, and artifact attestations. Those mechanisms do not replace scientific regeneration.
