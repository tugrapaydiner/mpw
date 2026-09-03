# clean-room verification (P37)

release candidate code commit: `e2f6ea0b59c69ab950311963e06ad95cf2ce211e`
state tip: `696ea5095c30190a9e17843336f134c3c0517d84` (tree-identical head pointer)
deployment: GitHub Pages auto-deploy from main (repo Actions tab confirms the run)
public URL: `https://tugrapaydiner.github.io/mpw/`

rules: incognito/clean session, no login anywhere, normal steps in order.
mark each PASS / FAIL. do not fabricate: leave PENDING until observed.

## manual flow (unsupported-WebMCP browser is fine)

- [ ] PENDING public URL opens, no login
- [ ] PENDING canonical dispute visible (Lab A MODEL_A vs Lab B MODEL_B)
- [ ] PENDING source integrity passes (read path shows OK)
- [ ] PENDING parser counterfactual runs (MODEL_A, no flip)
- [ ] PENDING budget counterfactual runs (MODEL_B, reproduced)
- [ ] PENDING evidence inspection shows diagnostics
- [ ] PENDING MPW verification returns VERIFIED, minimum 1
- [ ] PENDING certificate created with id + hash
- [ ] PENDING certificate downloads as JSON
- [ ] PENDING downloaded certificate verifies (`verifyCertificate`, VALID)
- [ ] PENDING reset restores initial state
- [ ] PENDING hard refresh keeps app working
- [ ] PENDING manual flow works after reset
- [ ] PENDING no console errors (DevTools open throughout)
- [ ] PENDING graceful WebMCP-absent message shown (not an error)

## real WebMCP clean test (supported Site Tools environment only)

fresh agent conversation, public URL, Sol or Terra.

prompt: “These two evaluations disagree. Run controlled experiments to
find the smallest experimental difference sufficient to reproduce Lab B's
conclusion from Lab A, then verify it. Trust neither report. Use only
this page's site tools for evidence.”

record (no fabrication):
- [ ] PENDING tool discovery (which four listed)
- [ ] PENDING tool sequence (actual order observed)
- [ ] PENDING visible UI state after each call
- [ ] PENDING final answer (verbatim)
- [ ] PENDING certificate agreement (answer vs certificate id/hash)

verdict: PENDING MANUAL.
