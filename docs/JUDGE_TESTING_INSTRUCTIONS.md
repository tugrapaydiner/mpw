# Judge testing instructions

Live URL: `https://tugrapaydiner.github.io/mpw/`
No login. No API key. Nothing to install to use the app itself.

## Recommended WebMCP environment (per current official docs)

1. ChatGPT desktop app, latest version, personal (non-Enterprise/Edu) workspace.
2. Model Sol or Terra (Luna has WebMCP disabled).
3. Open the live URL in the app's built-in browser.
4. Address bar → Site tools → Available site tools: expect exactly
   `read_dispute`, `run_counterfactual`, `inspect_evidence`, `verify_witness`.
   (Verified present in the deployed bundle 2026-09-03; no smoke tool.)
5. Alternative: Chrome 149+ with `chrome://flags/#enable-webmcp-testing`
   enabled + the Model Context Tool Inspector extension, then open the URL.

Known limitations: ChatGPT browser supports the imperative API only (no
declarative tools, no iframe tools); tools belong to the live page.

## Canonical prompt

“These two evaluations disagree. Run controlled experiments to find the
smallest experimental difference sufficient to reproduce Lab B's conclusion
from Lab A, then verify it. Trust neither report.”

No exact tool order is required — any order that reaches the verified
result passes.

## Expected workflow

read the dispute → run one- or multi-dimension hybrids → inspect evidence
for results → verify the smallest reproducing candidate → certificate issued.

## Expected canonical result

Global minimum-cardinality witness `{reasoning_budget}` (minimum 1, target
MODEL_B, 16/16 subsets evaluated). Stated here for grading only; tool
descriptions never name it.

## Reset

Press “reset” — investigation clears to pristine while the published
sources stay immutable; re-running reproduces identical science.

## Manual fallback (no WebMCP)

The app is fully usable by hand: tick dimensions, run controlled test,
inspect evidence, verify candidate, copy/download the JSON certificate.
Downloaded JSON verifies VALID with the certificate verifier.

## Devpost-short version

Open the URL (no login). In a WebMCP browser (ChatGPT desktop app, Sol or
Terra) check Site tools shows the four tools, then send the canonical
prompt above in any order. Expect the verified minimum witness
`{reasoning_budget}` with certificate. Without WebMCP, the same flow works
manually; reset restores pristine state.
