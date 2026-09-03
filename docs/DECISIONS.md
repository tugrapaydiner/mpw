# decisions

- D001 no runtime LLM/API dependency. static bundle, engine is pure functions.
- D002 top-level imperative WebMCP canonical path. no iframes, no declarative.
- D003 agent never calculates/certifies statistics. deterministic code only.
- D004 human and agent share engine/services. one `mpwService`, ui + tools call it.
- D005 model outcomes synthetic. banner + readme say so.
- D006 aggregate metrics always derive from item-level outcomes.
- D007 v1 target = four WebMCP tools. exactly four unless evals prove insufficient.
- D008 cross-origin mode optional only. never required.
- D009 INCONCLUSIVE first-class. CI covering zero is a valid result.
- D010 MPW means global minimum cardinality. all co-minimums returned.
- D011 bootstrap is category-stratified and paired. 10k replicates, pinned seed.
- D012 certificate hash excludes wall-clock generation time. ui meta stays outside.
- D013 no public AI-generated project name. display name PROJECT_NAME_UNSET.
- D014 source reports must pass self-integrity before reconciliation. else SOURCE_INTEGRITY_FAILURE.

older notes: vanilla-first then react move (same seeds); local sha256 for browser hashing; ts5 for linter compat; relative vite base for pages subpath; tunnel for manual test, pages for permanent url; order-agnostic trace grading.
