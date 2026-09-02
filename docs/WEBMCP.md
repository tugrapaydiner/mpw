# webmcp (pinned 2026-09-02, reverify before release)

spec: W3C WebML CG draft report, not a standard. docs: webmachinelearning.github.io/webmcp, developer.chrome.com/docs/ai/webmcp.
surface: `document.modelContext` primary, `navigator.modelContext` fallback (deprecated chrome 150). guarded, never throws without it.
registration: imperative `registerTool({name, description, inputSchema, execute})` from the top-level page only.
needs secure context (localhost ok) + same origin. no iframe discovery, no cross-origin tools, no declarative api.

tools (exactly four): read_dispute, run_counterfactual, inspect_evidence, verify_witness.
service in `src/mpwService.js` shared by ui (`public/app.js`) + tools (`src/mpwTools.js`).
