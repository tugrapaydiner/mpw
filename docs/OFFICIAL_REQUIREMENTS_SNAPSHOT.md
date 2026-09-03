# official requirements snapshot (checked 2026-09-03)

sources: https://webmcp.devpost.com/rules (OpenAI WebMCP Challenge rules), https://learn.chatgpt.com/docs/webmcp (site tools), https://developer.chrome.com/docs/ai/webmcp (chrome guide). summarized, not copied.

- webmcp-powered web app, human+agent collaboration. affects: whole product direction.
- live url for chatgpt in-app browser or webmcp chrome. affects: static dist + hosting.
- public repo with all source/assets/instructions. affects: repo hygiene.
- open-source license, visible on repo page. affects: LICENSE file (MIT added).
- <3min public youtube demo with audio covering build + webmcp. affects: human task, pending.
- text description must cover: webmcp fit, better ux, what people+agents do together that was hard before, how webmcp was implemented. affects: submission form text, human task.
- testing instructions for judges (they may judge from text/video alone). affects: keep readme + video self-explanatory.
- english materials, free till judging ends (Sep 21 5pm PT). affects: no paywall, no auth.
- new during submission period (Aug 25–Sep 3 2026) or documented webmcp extension. affects: eligibility record.
- freeze repo/site/video after deadline. affects: release pin + fork to continue.
- registerTool shape `{name, description, inputSchema, annotations, execute}` from top-level page. affects: `src/webmcp/tools.ts` matches sample.
- subset only: no declarative api, no iframe tools. affects: already compliant.
- Sol/Terra support site tools, Luna disabled, not in Enterprise/Edu. affects: manual test setup.
