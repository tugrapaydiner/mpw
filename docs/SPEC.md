# SPEC (locked)

display name: PROJECT_NAME_UNSET.

thesis: two labs test the same models on the same benchmark and reach opposite established conclusions; a browser agent reconciles them by running controlled protocol counterfactuals while deterministic code verifies the answer.

audience: ai eval researchers, benchmark maintainers, eval engineers, teams reconciling conflicting model reports.

canonical world: 2 synthetic models (MODEL_A, MODEL_B), 1 benchmark, 400 paired items, 4x100 strata (multi-step, quantitative, instruction-following, tool).

four protocol dimensions: reasoning_budget (8192 high / 2048 low), answer_parser (tolerant / strict), retry_policy (one-retry / none), tool_access (standard / restricted). 16 hybrids.

MPW: globally minimum-cardinality subset of exposed dims whose adoption reproduces the target conclusion. all ties returned, never inclusion-minimal alone.

conclusion rule: Delta = acc(A) - acc(B), 10k category-stratified paired bootstrap, 95% percentile. MODEL_A iff ciLow > 0, MODEL_B iff ciHigh < 0, else INCONCLUSIVE. never from the point estimate.

synthetic disclosure: all outputs synthetic and deterministic, not claims about real models. shown in readme + ui banner.

architecture: static bundle only. no runtime api, llm, database, auth, backend, or gpu. ui + webmcp share one service over a pure engine.
