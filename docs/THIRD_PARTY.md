# Third-party material

## Runtime dependencies

The static application depends on permissively licensed packages documented in `docs/DEPENDENCIES_AND_LICENSES.md`. No third-party fonts, logos, images, music, or hosted scripts are bundled.

## External Fragility Grid study

The optional external research workflow consumes the released correctness records from:

- project: `NikolaTesla-007/fragility-grid`;
- pinned source commit: `3f51444ead009d8351de1b6b19bf901c4da3d420`;
- author: V. S. Raghu Parupudi;
- license: MIT for the released code and data, subject to the source benchmarks' own licenses for embedded question text.

The upstream MIT notice is preserved in `third_party/fragility-grid-LICENSE.txt`.

MPW does **not** retain or redistribute benchmark questions, answer choices, prompts, gold labels, or generated model text from the upstream JSONL files. The derived research package stores only source file paths and SHA-256 digests, model identifiers, benchmark/item identifiers, harness-coordinate metadata, and binary correctness outcomes. The package is a secondary analysis artifact, not a model rerun or independent replication of the upstream paper.

Brand names such as OpenAI, ChatGPT, Chrome, GitHub, and model-family names appear only as factual references. No third-party logos are bundled.
