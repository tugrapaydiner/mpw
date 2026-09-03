# P09 simulator forensic audit — verdict: PASS

objective: prove P08 fake or circular. failed to. no tuning needed, none applied.
files changed: this report only. no code, no criteria touched.
tests run: `npm run verify` green (81/81, build ok).

source findings (all clean):
- no winner labels/branches anywhere; verifier refs only in downstream consumers (grade, cert, service), never simulator/fixture.
- no Math.random/Date.now/mutable globals in engine (globalThis only in webmcp feature-detect).
- lab identity + 2048 literals only in fixture data, never in simulator branches (budget via /8192 normalization).
- profile numbers are documented interpretable params, no hack/fudge markers.
- no aggregate tables; outcomes computed per item from thresholds + tuple draws.

mechanism findings (all coherent):
- every latent has a live role; parser failures appear ONLY in strict worlds; recoveries are zero exactly in no-retry worlds; tool failures rise only under restriction and concentrate on tool items; budget collapse hits high-demand strata for A while B holds (efficiency story checks out).
- per-world deltas match the service stats exactly.

regeneration: two independent from-scratch 12,800-receipt dumps hashed identical (cc6dd2c8…).

16-world diagnostics (raw A/B correct, delta; parserFailures; recoveries; toolFail/itemOutcomes):
- base 347/304 d=-0.1075 pFail=0 rec=66
- answer_parser 315/289 d=-0.0650 pFail=57 rec=76
- reasoning_budget 241/290 d=+0.1225 pFail=0 rec=112
- retry_policy 319/266 d=-0.1325 pFail=0 rec=0
- tool_access 326/285 d=-0.1025 pFail=0 rec=77
- full 126/210 d=+0.2100 pFail=36 rec=0
(remaining 10 hybrids follow the same coherent pattern; deltas monotonic in penalties.)

gate result: GREEN. final verdict: PASS — not fake, not circular.
blockers: none.
