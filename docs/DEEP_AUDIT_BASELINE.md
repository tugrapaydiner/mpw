# Deep Audit Baseline

**Audit date:** 2026-09-03  
**Audited revision:** `main@78a74cf45f16da19d03eb84e995bc23ea87f11f6`  
**Scope:** source, tests, generated artifacts, project claims, browser-agent surface, and current primary literature.  
**Status labels used here:**

- **Verified by source inspection:** the implementation path was traced in the repository.
- **Verified by execution:** a command or workflow actually ran and its result was inspected.
- **Not yet verified:** the evidence available in this audit did not establish the claim.

At baseline, the repository is a disciplined deterministic demo with unusually candid scope language. It is not yet a research-grade reconciliation system. Its strongest pieces are deterministic fixture generation, paired item-level evidence, content canonicalization, and a shared human/agent service. Its main weaknesses are a single answer-bearing synthetic world, pointwise inference after protocol-space search, fixed four-coordinate architecture, overclaimed certificate semantics, no executed agent-evaluation evidence, and no benchmark of reconciliation algorithms.

## True architecture

The source implements the following path:

```text
hard-coded synthetic publication definitions
  -> deterministic item generator + simulator
  -> item-paired outcome records
  -> category-stratified paired bootstrap
  -> finite protocol substitution service
  -> two witness implementations
       (full canonical enumeration; cardinality-first generic search)
  -> publication bundles + hashes
  -> reconciliation certificate wrapper
  -> global in-memory investigation state
  -> React UI and imperative WebMCP tools
```

This broadly matches the intended architecture, with four important qualifications:

1. Publication packages are not independent inputs. They are regenerated from the same in-bundle simulator and fixed fixture.
2. The certificate verifier primarily verifies serialization, hashes, shape, and selected IDs. It does not independently replay every scientific claim encoded in the certificate.
3. The generic cardinality-first search proves minimum cardinality and recovers all co-minimum witnesses at the first sufficient size, but currently labels itself `exhaustive` despite not evaluating larger subsets.
4. Application state can issue the canonical A-to-B certificate after a different successful verification request, so certificate/request binding is not presently reliable.

## Baseline scores

Scores are intentionally harsh. A score of 5 means a credible prototype with material research-grade gaps.

| Category | Score /10 | Strongest evidence | Biggest weakness | What excellent would look like |
|---|---:|---|---|---|
| Scientific rigor | 5.5 | Narrow non-causal language; source self-reproduction; deterministic item-level path | One calibrated synthetic dispute carries nearly the entire scientific claim | Multiple independent dispute families, explicit estimands, falsification cases, and external-data adapters |
| Statistical rigor | 4.5 | Paired, stratum-preserving bootstrap with pinned PRNG and explicit CI rule | The selected witness is chosen after many pointwise 95% intervals; model-run uncertainty is absent | Simultaneous/selection-aware inference, complementary paired diagnostics, and clear separation of finite-benchmark description from population inference |
| Originality | 5.0 | Useful combination of protocol reconciliation, exact finite search, browser tools, and portable records | Minimal counterfactual explanations, multiverse analysis, executable artifacts, and harness sensitivity all pre-exist | A demonstrated new reconciliation task, benchmark, and method with clear advantages over multiverse and explanation baselines |
| WebMCP architecture | 6.5 | Semantic operations share application services with the human UI | API lifecycle follows an evolving draft; tool outputs and lifecycle cleanup are under-specified | Current-spec registration lifecycle, output contracts, adversarial tool tests, and measured agent gains over DOM-only use |
| Agent reliability | 3.0 | Deterministic trace grader and sensible pending protocol | No real agent trials; trace grader still expects an obsolete argument shape | Multi-prompt, multi-model executed evals with discovery, chaining, recovery, efficiency, and overclaim metrics |
| Product usefulness | 4.5 | The controlled-test flow is understandable and manually operable | Only one fixed synthetic dispute; limited reason to return | Importable publication packages, comparison history, evidence drill-down, and credible real evaluation workflows |
| Reproducibility | 7.0 | Deterministic seeds, generated fixtures, scripts, lockfile, and one-command verification | No branch CI for research changes; environment capture and independent reproduction are limited | Pinned CI matrix, artifact checksums, container or reproducible environment, and third-party reproduction instructions |
| Provenance | 6.5 | RFC 8785 canonicalization boundary, SHA-256 identities, no self-hash recursion | Hashes establish content identity, not scientific replay; schema is implicit TypeScript | Versioned JSON Schemas, detached artifacts, full replay verifier, signatures/attestations, and migration policy |
| Security | 4.5 | Strict argument checks, no runtime secrets/backend, no unsafe HTML path observed | WebMCP prompt-injection/trust-boundary model is mostly documentation; tool registration lacks lifecycle abort and limits | Explicit untrusted-content envelopes, size limits, lifecycle cleanup, race tests, CSP guidance, and adversarial WebMCP evals |
| Code quality | 5.5 | Scientific logic is mostly pure and separated from React | Duplicate domain schemas, fixed-dimension casts, large modules, global mutable investigation state | One canonical schema, generic protocol core, replayable services, smaller modules, and no scientific/UI coupling |
| Testing quality | 6.5 | Many adversarial and determinism tests; item-level invariants are present | Tests are concentrated on one canonical answer and do not benchmark broad witness landscapes | Property tests, alternate fixtures, mutation testing, certificate replay tests, and cross-algorithm ground-truth checks |
| Scalability | 3.5 | Exact cardinality-first enumeration is correct for small finite spaces | Hard cap at 20, no empirical scaling study, and no structural assumptions enabling pruning | Instrumented exact baseline, explicit worst-case lower bound, optional structure-aware solvers, and budgeted partial-search semantics |
| Documentation | 7.0 | Extensive decisions, claims, simulator, provenance, and limitation notes | Hackathon phase history dominates; several documents describe obsolete paths or overstate verification | Research-centered README, versioned methods, evidence-status matrix, landscape, benchmark, and open questions |

**Simple average: 5.3/10.**

## P0 findings — correctness and scientific integrity

### P0.1 Certificate verification is not scientific replay

`verifyCertificate` recomputes the certificate hash and validates many fields, but it does not recompute source scores, audit-row conclusions, sufficiency labels, all minimum witnesses, or the evidence hash from independently supplied evidence. A maliciously or accidentally altered scientific body can be re-canonicalized and re-hashed into a wrapper that passes several checks. Calling this a portable scientific verifier is therefore too strong.

**Required correction:** distinguish content-integrity validation from engine replay, bind certificates to a direction and candidate, and add a deterministic deep verifier that recomputes the reconciliation result.

### P0.2 Verification request and issued certificate can diverge

The state layer calls `buildCertificate()` without the actual `baseLab` or candidate whenever a witness verification returns `VERIFIED`. The builder defaults to the canonical A-to-B singleton. A reverse-direction or alternate valid request can therefore receive an unrelated certificate.

**Required correction:** certificate inputs must be derived from the verified request; unsupported directions must not receive a certificate.

### P0.3 `exhaustive` is used for two different guarantees

The generic witness search stops after completing the first sufficient cardinality, which is enough to prove global minimum cardinality and enumerate all co-minimum witnesses at that size. It is not a full landscape enumeration. Reporting `exhaustive: true` conflates **minimum proof completeness** with **protocol-landscape completeness**.

**Required correction:** expose separate fields such as `minimumProven`, `coMinimumComplete`, and `landscapeExhaustive`.

### P0.4 Selection invalidates a naive 95% witness-confidence reading

The project searches many protocol subsets and then reports the first/minimum subset whose pointwise 95% interval yields the target category. Pointwise coverage for each fixed subset does not imply 95% coverage for the adaptively selected witness or the family of subset conclusions.

**Required correction:** treat the current bootstrap as descriptive sensitivity for a fixed finite benchmark, and add a simultaneous familywise analysis before making confidence-qualified witness claims.

## P1 findings — major research/product improvement

1. Generalize protocol substitution and witness search over arbitrary finite coordinate records. Keep simulator-specific semantics outside the generic reconciler.
2. Add a deterministic reconciliation benchmark with multiple co-minimum, interacting, unresolved, inconclusive, redundant, non-monotone, and corrupted cases.
3. Add bidirectional reconciliation. Minimum witnesses can be asymmetric because the hybrid path and conclusion map need not be symmetric.
4. Add effect-restoration and nuisance-effect diagnostics with explicit units; do not collapse them into an arbitrary score.
5. Replace the answer-bearing certificate with a versioned replay artifact and JSON Schema.
6. Update WebMCP registration to the current `document.modelContext` lifecycle and explicitly unregister with `AbortController`.
7. Fix the agent trace grader to current tool schemas and build a larger deterministic prompt/trace corpus without fabricating model results.

## P2 findings — valuable strengthening

1. Add exact paired discordance diagnostics (including exact two-sided McNemar/binomial p-values) as complementary evidence, not as a replacement for effect-size intervals.
2. Add empirical scaling instrumentation and safe limits for exact search.
3. Consolidate duplicated protocol/domain schemas and naming conventions.
4. Add input-size limits and explicit untrusted-content labeling to browser-tool payloads.
5. Add branch CI covering typecheck, lint, tests, build, benchmark, and generated-artifact drift.
6. Rewrite the README around the research problem rather than the challenge timeline.

## P3 findings — polish and optional work

1. Simplify decorative phase-map treatment and expose direction, estimand, and uncertainty more clearly.
2. Move historical phase reports under an archive index.
3. Add a small import-package design document before implementing arbitrary upload.
4. Improve responsive typography only after scientific workflow changes stabilize.

## Baseline verification status

| Claim | Status at baseline |
|---|---|
| Repository and source tree accessible | Verified by source inspection |
| `main` HEAD recorded | Verified from remote GitHub state |
| Research branch isolated from `main` | Verified from remote GitHub state |
| Existing `npm run verify` passes at audited HEAD | Not yet verified in this audit session |
| Canonical 16-world result matches generated data | Verified by source inspection; prior repository reports claim execution, not independently trusted here |
| WebMCP works in a supported real browser | Not yet verified in this audit session |
| Real agents reliably reconcile the dispute | Not yet verified; project documentation explicitly says trials are pending |
| Certificate independently proves the scientific result | Not verified; source inspection contradicts the strong form of this claim |
