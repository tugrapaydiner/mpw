# P39 documentation

objective: README from implemented behavior only, proven install path.
files changed: `README.md` (full rewrite), this report.
tests run: `npm run verify` green in main tree (192/192 in 30 files, build ok) and in a fresh worktree checkout (npm ci + verify, 192/192).

content: all 22 required sections; mandatory synthetic-data sentence
verbatim; math section defines Δ(θ), CI-only rule, θ_(A←B,S),
sufficiency, global minimum, co-minimums, conditional limitation —
checked against MPW_DEFINITION.md and engine; stats state fixed-strata
paired bootstrap + limits; recompute list explicit; WebMCP value stated
as shared-state experimental ops; related work defers to P38 with
no first-ever claims; mermaid diagram (GitHub-safe rendering).

clean-checkout proof: fresh worktree at HEAD + `npm ci` + full verify =
green 192/192. local instructions work as written.

gate result: GREEN (verify to confirm).
blockers: none.
