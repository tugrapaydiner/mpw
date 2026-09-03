# P05 domain model

objective: strongly typed core domain, exact names, no behavior change, no features.
files changed: `src/types/domain.ts` (new), `tests/engine/domain.test.ts` (new).
tests run: `npm run verify` green (typecheck, lint, 67/67 in 15 files, build).
failures discovered: domain re-exported a missing member (fixed to local definition).
fixes: VerificationStatus defined locally.
gate result: GREEN.
content: LabId, ModelId, BenchmarkCategory (upper-snake + stratum-key map), ProtocolDimension, Conclusion, VerificationStatus, Protocol (0|1 retry) with lossless runtime maps, BenchmarkItem, SyntheticModelProfile, Protocol, PublicationManifestCore (no hashes), DeclaredPublicationResult, ItemReceipt (mechanism fields, no winner fields), ExperimentRequest/Result, EvidenceSummary, ConfidenceInterval, ProtocolSubset, WitnessVerification, SourceIntegrityResult, CertificateBody/Wrapper.
notes: runtime keeps pinned wire encodings; maps bridge them. no any anywhere (lint enforced). type tests via expectTypeOf.
blockers: none.
