# P32 UI polish

objective: premium scientific instrument feel, zero semantic change.
files changed: `src/app/instrument.css` (new), `src/app/App.tsx` (restyle same data/services), `src/app/main.tsx` (+css import), `src/app/verdict.ts` (+categoryInsight), `tests/app/verdict.test.ts` (+insight + css scan), `scripts/capture-states.mts` (new), `docs/ui-reference-states.json` (new, 26KB), this report.
tests run: `npm run verify` green (183/183 in 28 files, build ok).
failures discovered: none.

design: contradiction banner dominates viewport; lab cards differ by border style + ■/□ glyphs + text (never color-only); system fonts; no imagery/logos; flex-wrap grid collapses on narrow screens; native buttons/checkboxes, skip link, focus-visible ring, aria-live status/verdict/result regions, labeled source tags; animations limited to 160ms result flash + busy pulse with full prefers-reduced-motion kill; agent calls re-render synchronously through the store.

wording/semantics untouched: verdict.ts gained one additive pure function. secondary insight is derived ("Largest measured shift in multi step reasoning (Δ -0.29 vs overall Δ -0.1225).") — pinned by test against live engine output, cause-free by test. one deviation: spec's example sentence assigned budget as cause; shipped the descriptive form instead (causal-discipline rule outranks the mock).

reference states: five deterministic snapshots (initial, after-read, parser, budget, verification+certificate) captured via services into docs/ui-reference-states.json for review.

gate result: GREEN.
blockers: none.
