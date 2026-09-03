# P24 WebMCP tool spec

objective: tool design on paper, no implementation.
files changed: `docs/WEBMCP_TOOL_SPEC.md` (new), this report.
tests run: `npm run verify` green (176/176 in 27 files, build ok; no code touched).
failures discovered: none (design phase).

content: exactly four tools with positive functional descriptions (no
"do not", no answer leakage, no forced workflow); strict enums, no
dupes, no extra props; concise outputs; experimentId as the run->inspect
link; structured error codes split recoverable vs integrity; annotations
verified against current docs (readOnlyHint/untrustedContentHint only
observed): reads true, state-updating run/verify honestly false;
canonical dispute id pinned from live hashes
(`mpw-dispute-59b0f51c99bcffcd`); worked example with live values;
five implementation gaps listed for P25.

gate result: GREEN.
blockers: none.
