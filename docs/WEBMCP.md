# webmcp (verified 2026-09-02 vs official docs, reverify before release)

official: https://learn.chatgpt.com/docs/webmcp (site tools = ChatGPT's WebMCP impl).
confirmed: Sol + Terra support it, Luna disabled. desktop app built-in browser, Work + Codex discover. not in Enterprise/Edu, rollout-dependent, update the app.
supported: top-level-page JS registration only. NOT supported: declarative api, iframe tools (same-origin included).
shape follows the official sample exactly: `document.modelContext.registerTool({name, description, inputSchema, annotations, execute})`, guarded feature-detect, readOnlyHint set, narrow inputs, enough-to-verify outputs.
broader spec/chrome may offer more — not relied on.

tools (exactly four): read_dispute, run_counterfactual, inspect_evidence, verify_witness.
service in `src/mpwService.js` shared by ui (`public/app.js`) + tools (`src/mpwTools.js`).
