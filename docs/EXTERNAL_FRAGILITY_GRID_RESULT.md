# External Fragility-Grid Reconciliation Result

## Why this study exists

The canonical MPW dispute is deterministic and synthetic. It is useful for exact testing, but it cannot by itself show that the reconciliation abstraction transfers to data created independently of the repository.

This study applied the generic exact reconciler to a published external harness-configuration grid associated with `arXiv:2608.21382`. The synthetic canonical simulator was not used to generate the external grid values.

The goal was not to search indefinitely for a favorable example. Five candidates were frozen for the study and evaluated under two explicit criteria.

## Criteria

### Minimum-witness criterion

A candidate passes when complete enumeration of its exposed endpoint-substitution cube identifies a globally minimum witness of cardinality two that reproduces the target categorical conclusion.

This is the standard descriptive MPW criterion. It permits a singleton to change the base conclusion without fully reproducing the target.

### Strict interaction criterion

A candidate passes the stronger criterion only when:

1. the two-coordinate substitution reproduces the target conclusion;
2. neither constituent singleton changes the base categorical conclusion;
3. no smaller substitution reproduces the target.

This criterion is deliberately harder. It distinguishes a genuinely interaction-only categorical reversal from a pair in which one coordinate already moves the conclusion partway or into another category.

## Executed result

| Quantity | Result |
|---|---:|
| Frozen candidates | 5 |
| Candidates with a globally minimum two-coordinate witness | 5 |
| Candidates passing the strict interaction criterion | 0 |

The correct interpretation is mixed:

- **Positive:** exact minimum-witness reconciliation operated on an independently published harness grid, rather than only on MPW's canonical simulator.
- **Negative:** none of the five frozen cases demonstrated the preregistered stronger interaction-only pattern.

The negative result is retained because dropping it would overstate the external evidence.

## What the result supports

The study supports the limited claim that a complete external protocol grid can be represented as a finite reconciliation landscape and searched for globally minimum categorical witnesses.

It also demonstrates why returning the full landscape and singleton diagnostics matters. Reporting only the successful pair could make an ordinary cumulative or sequential effect look like an irreducible interaction.

## What it does not support

The study does not establish:

- that protocol coordinates caused the original ranking changes;
- that the published measurements are true or authenticated;
- that two-coordinate witnesses are common;
- that the five candidates were representative of all available cases;
- item-level, repeated-run, or post-selection uncertainty not present in the source grid;
- that WebMCP or an agent improved the statistical result;
- that the external paper used or endorsed MPW terminology.

## Reproducibility identity

The executed GitHub evidence is bound to:

- study commit: `bcd9482062f7f908475aebf9ab5c37d4107ad8ff`;
- workflow: `External Fragility Grid Study`;
- workflow run: `33814044740`;
- workflow job: `100842076421`;
- uploaded artifact: `9916109342`.

The concise machine-readable result is stored in:

`data/external/fragility-grid-study-summary.json`

The artifact and repository implementation establish execution and code provenance within GitHub. They do not substitute for an independent third-party reproduction.

## Evidence-status ledger

| Claim | Status |
|---|---|
| The external-study workflow completed on the recorded commit | VERIFIED BY EXECUTION |
| Five frozen candidates were evaluated | VERIFIED BY EXECUTION |
| All five had a globally minimum cardinality-two witness under the declared categorical criterion | VERIFIED BY EXECUTION |
| Zero passed the stronger singleton-invariance interaction criterion | VERIFIED BY EXECUTION |
| The generic reconciler and study code are inspectable in the repository | VERIFIED BY SOURCE INSPECTION |
| An independent team reproduced the result | NOT YET VERIFIED |
| The source grid contains sufficient information for repeated-run or item-level uncertainty inference | NOT ESTABLISHED |

## Scientific consequence

This result narrows rather than inflates MPW's external claim. The project now has evidence that its exact reconciliation operation can be applied outside its own simulator, but not yet evidence that it discovers novel causal interactions or robust stochastic witnesses in real model evaluations.

A stronger follow-up should predeclare a larger candidate frame, publish all exclusions, preserve the complete source grid, and—where available—use item-level repeated evaluations so deterministic, familywise, and robust-witness results can be compared.
