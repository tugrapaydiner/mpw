# Independent Certificate Verification

MPW now provides two deliberately different verification paths.

## Primary TypeScript replay verifier

`npm run verify:certificate -- <certificate.json>`

This verifies the wrapper, expected evaluator identity, publication identities, source declarations, complete finite landscape, witness decision, and deterministic evaluator replay.

## Independent Python audit verifier

`python3 scripts/verify-certificate-audit.py <certificate.json>`

This implementation uses only the Python standard library and imports no MPW TypeScript code. It independently checks:

- exact wrapper keys;
- SHA-256 binding to the supplied canonical bytes;
- certificate id derivation;
- parsed canonical bytes structurally equal the body;
- finite JSON values;
- protocol-schema and endpoint consistency;
- exposed/omitted dimension partitioning;
- every audit row is the exact directional hybrid for its subset;
- sufficiency equals categorical target-conclusion equality;
- exhaustive subset coverage when claimed;
- evaluated and total subset counts;
- recomputed global minimum cardinality;
- complete co-minimum witness recovery;
- selected-candidate status;
- empty/full audit rows agree with source replay.

The accompanying mutation suite re-hashes altered certificates and verifies that changes to sufficiency, minimum witnesses, hybrid protocols, and endpoint observations are still rejected.

## Deliberate limitation

The independent verifier does **not** rerun the simulator or statistical evaluator. It verifies the finite-search proof from the certificate's embedded audit. The TypeScript verifier remains responsible for evaluator replay.

This separation is intentional and must not be described as two independent reproductions of the upstream measurements. The two implementations overlap on wrapper/search logic but have different trust boundaries:

| Question | TypeScript replay | Python audit verifier |
|---|---:|---:|
| Hash/body integrity | yes | yes |
| Evaluator identity | yes | no |
| Source outcome/statistical replay | yes | no |
| Hybrid protocol construction | yes | yes, independent implementation |
| Sufficiency labels | yes | yes, independently recomputed from audit observations |
| Global minimum and all ties | yes | yes, independent implementation |
| Publisher authenticity | no | no |
| Truth of upstream measurements | no | no |

## Why this matters

A producer and verifier written against the same abstractions can share the same defect. The independent audit implementation reduces that risk for the central combinatorial claim without overstating what it verifies.
