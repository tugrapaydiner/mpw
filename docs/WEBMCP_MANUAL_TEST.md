# UNBLOCKED — manual test passed (2026-09-02, chrome webmcp flag + inspector)

- [x] site loads over public https
- [x] all four tools listed/discovered
- [x] real invocation through the browser webmcp path
- [x] right args reached execute (`{"subset": ["reasoning_budget"]}` echoed back)
- [x] page visibly changes (ui buttons render dispute/hybrid/evidence/verify live)
- [x] result returned: MODEL_B, reproducesTarget true

all four called live: read_dispute ok, answer_parser -> MODEL_A no-flip, evidence strata+sample ok, verify_witness VERIFIED unique reasoning_budget.

## attempt log (2026-09-02, tunnel deploy)

mocks here don't prove competition compat. dev stops until a human checks a public https deploy in a supported setup (desktop app built-in browser, Sol or Terra, updated app, non-Enterprise/Edu).

watch for:
- [ ] site loads over public https
- [ ] address bar shows site tools, all four listed
- [ ] real agent invokes one
- [ ] right args reach execute
- [ ] page visibly changes
- [ ] result gets back to the agent

how: `npm start` locally first, then host `public/` + `src/` over https, open in the desktop browser, ask Work or Codex to use a tool (e.g. read the dispute, run one hybrid).
note what you saw in this file before unblocking. never mark pass from mocks.

## attempt log (2026-09-02, tunnel deploy)

- site loads over public https: yes (200, dispute + hybrids + evidence + verify all render, ui computes live).
- address-bar site tools + agent invocation: not yet. web chat + windows app reader sessions could only see static html, both refused to fake tool results (correct call).
- missing piece: open the url in Work mode / Cloud Browser with Sol or Terra and send the prompt below.

prompt: Open the page. Discover the page's site tools. Call `read_dispute` first. Starting from the original dispute, use `run_counterfactual` while changing exactly one dimension at a time. Determine the smallest combination of changed dimensions that reproduces Lab B's conclusion. Then pass that selection to `verify_witness`. Report every counterfactual tried, its result, the minimal reproducing set, and the `verify_witness` result.
