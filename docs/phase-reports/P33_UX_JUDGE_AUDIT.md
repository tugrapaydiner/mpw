# P33 UX judge audit

objective: cold-judge the app, fix BLOCKER/HIGH UX only, no scope creep.
files changed: `src/app/App.tsx` (copy + hierarchy tweaks), `src/app/instrument.css` (+cert id style), this report. no science, service, or wording-contract changes.
tests run: `npm run verify` green (183/183 in 28 files, build ok).

scores (cold, pre-fix → post-fix where fixed):
- first 5 seconds 7/10: banner + lab cards land the contradiction; title still domain-jargon (accepted, product name).
- webmcp visibility 5 → 8 (HIGH, fixed): agent path was one gray line. now an explicit "Agent path (WebMCP)" status plus a HUMAN/AGENT/SYSTEM roles legend in activity.
- scientific clarity 8 → 9 (MED, fixed): one CI gloss line under each lab card (95% interval for A−B; sign decides).
- verification clarity 7 → 9 (HIGH, fixed): added the plain sentence "Minimum witness: the smallest set of protocol changes that reproduces the other lab's conclusion."
- product coherence 7 → 8 (MED, fixed): certificate id promoted to serif artifact heading; hash/limits/buttons subordinate.
- impact 6 → 7 (LOW, fixed): one audience line under the banner.

attacks adjudicated: generic dashboard (dodged), too much text (ok for instrument), too many cards (ok), minimal-witness confusion (fixed), synthetic disclosure (strengthened: item counts in banner), fake numbers (banner + coverage mitigate), CI (fixed), roles (fixed), hidden reset (visible, pass), cert hierarchy (fixed), jargon (button "run counterfactual" → "run controlled test"; cardinality kept, now glossed), causal overclaim (pass, scanned), AI sludge (pass), slow flow (pass).

not changed (out of scope): features, flows, verdict strings, services, evidence JSON detail level.

gate result: GREEN.
blockers: none.
