# P22 application state

objective: product state around proven science, one shared service layer, no styling.
files changed: `src/state/investigation.ts` (new: store + HUMAN/AGENT services), `src/webmcp/tools.ts` (delegates with AGENT), `src/app/App.tsx` (delegates with HUMAN, plain status/activity/reset render), `tests/state/investigation.test.ts` (new, 11 tests), this report. `mpwService` untouched underneath.
tests run: `npm run verify` green (168/168 in 26 files, build ok).
failures discovered: my stale-cert test ran verify before any experiment, so the "repeat" was genuinely new and correctly staled the cert. test reordered, implementation untouched.

state: seq, dispute/integrity/differences, experiment history + selection, evidence view, candidate, verification, certificate {id, hash, status, min, valid}, activity [{seq, source, op, detail}], status, error. sources HUMAN/AGENT/SYSTEM. identity is monotonic seq only — no clock in the module (no Date).

rules: repeats reuse cached results (no dup history, no stale); views never stale; new experiments or non-verified re-verifies stale the cert; VERIFIED builds the full canonical certificate; reset restores pristine (fresh === post-reset, asserted); publication hashes + experiment ids identical across reset; HUMAN/AGENT payloads byte-identical; same op sequence gives same event order.

gate result: GREEN.
blockers: none.
