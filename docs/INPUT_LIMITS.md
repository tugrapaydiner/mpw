# Input and Work Limits

Finite protocol spaces can still exhaust memory or compute. This document records the current defensive limits and the claims they protect.

## Bounded JSON

The static-grid builder and reconciler use `parseBoundedJson` before package validation.

Default limits:

| Resource | Limit |
|---|---:|
| UTF-8 input bytes | 10 MiB |
| nesting depth | 32 |
| structural nodes | 1,000,000 |
| elements in one array | 100,000 |
| keys in one object | 10,000 |
| characters in one key or string | 1,000,000 |

The parser rejects the keys `__proto__`, `prototype`, and `constructor` at every depth to avoid passing prototype-sensitive structures into future merge or transformation code.

The pre-parse byte check is the first availability boundary: `JSON.parse` can allocate memory proportional to accepted input size. The iterative post-parse walk then enforces structural limits without recursive call-stack growth.

These values are engineering defaults, not universal safe limits. A browser, serverless worker, or multi-tenant service may require substantially smaller budgets.

## Static protocol grids

Version 1 accepts at most 20 endpoint differences, corresponding to at most 1,048,576 exact endpoint-substitution worlds.

That theoretical maximum is too large for the default 10 MiB JSON boundary in ordinary cases. Both limits apply; the first reached rejects the input.

A future network service must additionally enforce:

- request timeout and cancellation;
- process memory limit;
- per-user and per-origin quotas;
- decompression limits;
- streaming upload bounds;
- aggregate concurrent-work limits.

## Exact search

### Complete research search

Exact landscape and certificate builders use explicit `maxEvaluations`. They reject a requested proof when the budget cannot cover the required finite family.

### Anytime search

`anytimeCardinalityWitnessSearch` supports up to 1,024 declared coordinates by lazily generating combinations, but it evaluates at most the caller's positive safe-integer budget. A large dimension count does not authorize full powerset construction.

Partial results carry lower/upper cardinality bounds and proof-completeness flags. Budget exhaustion never becomes a no-witness or all-ties certificate.

### Cost search

Minimum-cost search currently materializes the finite subset list and therefore defaults to at most 20 dimensions. Costs must be non-negative safe integers, and additive totals must remain inside the safe integer range.

## Repeated-run robust witnesses

The direct robust-witness functions require the complete declared subset family. They are research utilities, not an arbitrary public upload endpoint.

The Monte Carlo validation utility caps:

- replications at 100,000;
- trials per subset at 1,000,000;
- dimensions at 20.

A production repeated-run service should accept compact success/trial counts where raw Boolean sequences are unnecessary, while preserving audit evidence separately. This avoids requiring memory proportional to every recorded indicator.

## Evidence samples in WebMCP

The canonical evidence-inspection tool returns bounded samples rather than hundreds of receipts by default. Input schemas constrain sample limits and protocol-dimension arrays.

No current WebMCP operation accepts arbitrary evaluator code, filesystem paths, URLs to fetch, credentials, shell commands, or unbounded raw evidence.

## Failure semantics

A limit failure means only that the requested operation was not completed under the configured resource budget. It must not be translated into:

- `NO_WITNESS`;
- `INCONCLUSIVE`;
- an empty witness;
- a partial minimum presented as exact;
- source invalidity unless the format itself violates the declared package contract.

Limit errors should report the relevant observed and maximum quantity so a caller can revise the study design explicitly.

## Testing

Current tests cover:

- pre-parse UTF-8 bytes;
- depth and node counts;
- array, object-key, key-length, and string-length limits;
- prototype-sensitive keys;
- deep iterative traversal;
- dimension and evaluation budgets;
- cost overflow;
- repeated-simulation caps;
- partial-search proof states.

Live browser memory and multi-request concurrency remain not yet verified.
