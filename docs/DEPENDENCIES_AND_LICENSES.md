# dependencies and licenses (P35, 2026-09-03)

our source: MIT (`LICENSE`, copyright 2026 tugrapaydiner). it covers our
code only; third-party packages below remain under their own licenses.

## production (shipped in the static bundle)

| package | version | license | purpose | required |
|---|---|---|---|---|
| react | 19.2.8 | MIT | ui rendering | yes |
| react-dom | 19.2.8 | MIT | dom binding | yes |
| canonicalize | 4.0.0 | Apache-2.0 | JCS serializer for provenance hashes | yes |

## development/build only (never shipped)

| package | version | license | purpose |
|---|---|---|---|
| vite | 8.2.2 | MIT | build + dev server |
| @vitejs/plugin-react | 6.1.1 | MIT | jsx transform |
| vitest | 4.1.11 | MIT | tests |
| vite-node | 6.0.0 | MIT | fixture/bundle/cert/scripts runner |
| typescript | 5.9.3 | Apache-2.0 | typecheck |
| eslint + @eslint/js + typescript-eslint | 10.9.1 | MIT | lint |
| @types/* | various | MIT | typings |

no unused packages: every entry is imported by src/tests/scripts/config
(verified by inspection; no depcheck needed at this size).

## vulnerabilities (npm audit, 2026-09-03)

production: 0. full tree including dev: 0. no upgrades required; no
action taken (policy: assess relevance before touching versions).

## third-party assets

none bundled: no images, logos, fonts, music, datasets, or external
requests. ui uses system font stacks + original css. all model/lab names
synthetic (MODEL_A/B, Lab A/B). platform names (Sol/Terra/Luna, ChatGPT,
Chrome) appear in docs only as factual compatibility references.
