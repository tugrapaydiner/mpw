# agent evals (separate from deterministic tests)

deterministic tests prove the engine. agent evals grade a recorded tool-call trace + final answer via `gradeTrace` in `src/engine/mpwAgentEval.ts`.

measured: discovery, valid-args rate, use of previous output, chain completion, conclusion agreement vs deterministic reference, recovery after tool errors, INCONCLUSIVE discipline, overclaim rate, unnecessary-call count.

pass needs: dispute read, VERIFIED chain, agreement with reference, every error recovered, no INCONCLUSIVE overclaim, zero overclaims, ≤24 calls.

order rule: any scientifically valid experiment order passes. the grader checks set coverage (reported subsets tested, verify called), never sequence. don't fail a valid trial for skipping the demo order.
