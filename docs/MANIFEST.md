# manifest (early stage, unhashed)

core: PublicationManifestCore { source, protocol, declared, seeds, evidence }
canonical form: sorted-keys JSON, no whitespace, full numeric precision.
order first: items by id; receipts by protocol/item/model; dims + subsets sorted;
verify table by cardinality then lexicographic. other arrays keep order.

hashes not required yet. later bundles may add protocol / evidence / manifest hashes.

hashes only prove content identity of canonicalized content.
they don't prove truth, publisher identity, causality, or that assumptions are right.
