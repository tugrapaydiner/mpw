# provenance spec (P18, 2026-09-03)

## serializer

JCS — JSON Canonicalization Scheme, RFC 8785 — via `canonicalize@4.0.0`
(Apache-2.0, zero dependencies, ships types, ~17KB unpacked). chosen because
all three adoption gates held: lightweight, license-compatible with MIT,
behavior probed and pinned in `tests/engine/mpwProvenance.test.ts`.

guarantees used: recursive object-key sort (UTF-16 code-unit order), stable
primitive encoding (shortest round-trip numbers, `-0` becomes `0`),
arrays preserve order, output ASCII-safe. verified by probe 2026-09-03:
`{b:[2,1],a:1}` -> `{"a":1,"b":[2,1]}`, NaN throws, `{a:undefined}` ->
`{}` (silently dropped — hence the gate below).

## pre-validation gate (`assertCanonicalizable`)

runs BEFORE the library on every input. rejects: `undefined`, functions,
symbols, bigints, class instances (non-plain objects), NaN, Infinity,
-Infinity — anywhere in the tree, with the offending path in the error.
nothing falsely labeled: the project claims JCS compliance only for the
byte serializer, never for its own normalization layer (documented here).

## normalization (before canonicalization)

logically unordered collections are normalized; meaningful order is kept:

| collection | rule |
|---|---|
| items | sort by `id` (`itemId` fallback), code-unit compare |
| receipts | sort by protocolId (subset-derived `+`-join in canonical dim order), then itemId, then modelId |
| protocol dimensions / subsets | `EXPOSED_DIMENSIONS` declaration order (`reasoning_budget`, `answer_parser`, `retry_policy`, `tool_access`) |
| witness subsets | canonical dim order inside, then cardinality, then code-unit join |
| verification table | cardinality, then canonical subset join |
| strata / models | declaration order PRESERVED (meaningful) |

comparisons never use `localeCompare` (ICU-dependent). only `<`/`>` on strings.

## digest

SHA-256 over UTF-8 bytes (`TextEncoder`, identical browser/Node).
implementation is the dependency-free `src/engine/sha256.ts`, pinned
against standard vectors (`""` -> `e3b0c44...`, `"abc"` -> `ba7816bf...`).

## hashes (`src/engine/mpwProvenance.ts`)

`hashProtocol`, `hashBenchmark`, `hashEvidenceBundle`, `hashExperiment`,
`hashManifestBody`, `hashCertificateBody`. single code path: existing
`canonicalize`/`experimentId`/`protocolKey` in `mpwManifest.ts` and the
certificate hash now delegate here. `hashExperiment` keeps the `experimentId`
input shape (baseLab/sourceLab/subset/protocol/engine, no ui metadata).

## meaning

a hash proves canonical content identity/integrity ONLY: same bytes in,
same hash out; any content change moves it. it proves nothing about truth,
model quality, or causality. verification procedure: renormalize the claimed
object with the functions above, re-canonicalize, re-hash, compare.
