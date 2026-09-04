# Protocol-Schema Alignment

## Problem

Real evaluation reports rarely expose identical protocol records. One source may call a coordinate `token_limit`, another calls it `thinking_budget`, while a canonical reconciliation study wants `budget`. Value encodings can also differ:

```text
2048 / 8192
short / long
low / high
```

Silently guessing that these fields are equivalent can manufacture or erase a minimum witness. MPW therefore treats alignment as an explicit, versioned research assertion.

## Scope of version 1

`FiniteProtocolAlignment` supports a strict one-to-one coordinate mapping from one source schema into one canonical target schema.

Each target coordinate must map to exactly one source coordinate. A source coordinate cannot be reused by two target coordinates. Every declared value of the mapped source coordinate must have exactly one explicit target value.

Version 1 supports:

- coordinate renaming;
- explicit categorical/numeric/Boolean/null value normalization;
- many-to-one value maps, reported as lossy;
- unmapped source-coordinate disclosure;
- unused target-value disclosure;
- rationale and study notes;
- alignment of two heterogeneous publication protocols into the same canonical schema.

It does not support one source concept being composed from several fields, splitting one source field into several target coordinates, conditional mappings, units conversion formulas, or probabilistic semantic alignment.

## Example

Source A:

```json
{
  "token_limit": 8192,
  "parse_mode": "exact",
  "temperature": 0
}
```

Canonical target:

```json
{
  "budget": "high",
  "parser": "strict"
}
```

The alignment explicitly maps:

```text
token_limit: 2048 -> low, 8192 -> high
parse_mode: exact -> strict, lenient -> tolerant
```

`temperature` remains unmapped and is reported. The aligned protocol does not pretend that temperature was absent or irrelevant.

## Lossy value maps

Suppose a source has extraction modes `0`, `1`, and `2`, while the target has only `strict` and `tolerant`:

```text
0 -> strict
1 -> tolerant
2 -> tolerant
```

The target coordinate is marked lossy because two distinguishable source states are merged. Such a mapping can reduce apparent protocol distance and change witness cardinality.

A lossy mapping may be scientifically justified, but downstream results must remain conditional on it and should be included in sensitivity analysis.

## Validation

The runtime validator requires:

- exact top-level and mapping fields;
- valid finite source and target schemas;
- every target coordinate mapped exactly once;
- no source-coordinate reuse;
- mapped coordinates present in their schemas;
- every source-domain value mapped exactly once;
- every mapped target value inside the target domain;
- valid source protocols before alignment;
- the same canonical target schema for a publication pair.

Mappings are normalized to target-schema coordinate order so input order does not alter the aligned protocol.

## Semantic uncertainty

Software can prove that an alignment is complete and internally consistent. It cannot prove that `token_limit` and `thinking_budget` measure the same scientific construct.

A real study should record:

- source definitions and code references;
- units and default behavior;
- whether values are directly equivalent or coarsened;
- rationale for every mapping;
- independent curator review;
- alternative defensible alignments;
- how witness results change under those alternatives.

Disagreement between curators is evidence about construct uncertainty, not an inconvenience to resolve silently.

## Unmapped coordinates

Unmapped source coordinates are first-class output. They may represent:

- irrelevant metadata;
- fixed constants;
- unsupported implementation details;
- hidden confounding protocol differences;
- coordinates omitted for lack of a common representation.

A witness over the aligned target schema is conditional on those omissions. The system must not imply they were experimentally ruled out.

## Relationship to static grids

A static protocol-grid package should be built only after alignment is frozen. The package records the canonical schema and explicitly exposed/omitted source differences.

If alternative alignments are scientifically plausible, each should produce a separately identified package or registered sensitivity family. Selecting the alignment that yields the smallest witness after inspecting results is invalid specification search.

## Future extensions

Research directions include:

- one-to-many and many-to-one coordinate transformations;
- hierarchical/grouped coordinates;
- unit conversion with exact rational transforms;
- partial and incompatible value states;
- probabilistic or curator-disagreement alignment sets;
- proof obligations for composed coordinates;
- witness stability across alignment alternatives.

These should not be added as generic flexibility without concrete external cases and falsifiable tests.

## Implementation and tests

- `src/research/protocolAlignment.ts`
- `tests/research/protocolAlignment.test.ts`

Tests cover renaming, value normalization, lossy maps, unmapped coordinates, pair alignment, target-order normalization, incomplete mappings, source reuse, source-value coverage, invalid domains, invalid source protocols, incompatible target schemas, unexpected fields, and malformed notes.

## Claim boundary

Alignment enables explicit interoperability. It does not establish semantic equivalence, causal transport, or absence of consequential omitted dimensions.
