# BLOCKED — MANUAL WEBMCP TEST REQUIRED

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
