# MASTER EXECUTION CONTRACT — Minimal Protocol Witness (v2, 2026-09-03)

persistent project law. overrides my habits and old chat. only the human overrides it.

## numbered prompt protocol

every numbered prompt must:

1. read this contract,
2. read `docs/BUILD_STATE.md`,
3. perform only its assigned phase, nothing more,
4. run `npm run verify` once available (typecheck + lint + tests + build),
5. update durable state (`docs/BUILD_STATE.md`, `docs/phase-reports/`, commit SHA),
6. report the gate result,
7. STOP.

never autonomously start the next numbered prompt.

## gates + history

- a phase is green only if verify passes end to end. one green subset never counts.
- checkpoints get committed only after important green gates.
- never force-push or rewrite history without explicit instruction.

## standing rules

- deterministic engine first, llm never calculates or certifies.
- claims stay narrow (`docs/CLAIMS.md`, `docs/LANGUAGE.md`, `docs/CONTRIBUTION.md`).
- official docs beat assumptions for external facts; reverify before release.
- mocks never prove compat (`docs/WEBMCP_MANUAL_TEST.md`).
- no secrets in commits. validate at boundaries.
