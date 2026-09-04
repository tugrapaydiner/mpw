# Security and Trust Model

## Scope

MPW is currently a static browser application plus deterministic local research code. It has no runtime database, authentication service, secret-bearing backend, or model API dependency. That reduces attack surface but does not remove risks from untrusted publication data, browser-agent tools, package parsing, dependency execution, or misleading verification claims.

This document distinguishes software integrity, content identity, publisher authenticity, scientific validity, and agent safety. They are not interchangeable.

## Assets

The system protects:

- correctness of protocol substitution and witness verification;
- integrity of publication, experiment, and certificate identities;
- separation between untrusted source text and executable instructions;
- consistency of shared HUMAN/AGENT investigation state;
- availability under bounded inputs;
- honest display of verification level and limitations;
- user control over browser-visible actions.

## Trust boundaries

### Trusted for one identified build

- reviewed source code at an identified commit;
- deterministic evaluator adapters explicitly selected by the verifier;
- protocol schemas and package bodies after runtime validation;
- canonicalization and hash implementations after their tests pass.

### Untrusted by default

- publication titles, descriptions, notes, and metadata;
- external static-grid rows;
- model- or grader-generated text;
- WebMCP arguments;
- browser DOM state;
- uploaded or downloaded JSON;
- claimed publication hashes not anchored to a trusted source;
- stale experiment or certificate IDs;
- cross-origin messages;
- dependency updates;
- instructions embedded in evidence.

## Threats and controls

### Prompt injection in publication evidence

**Threat:** a source publication includes text such as “ignore prior instructions” or asks the agent to call tools, disclose data, or accept a conclusion.

**Controls:**

- tool descriptions are authored by the application, never copied from publication text;
- source strings remain fields in structured results and are not promoted into system or tool instructions;
- the deterministic engine ignores natural-language instructions when computing results;
- final scientific status derives from validated structured evidence, not source prose.

**Residual risk:** an agent can still be persuaded by untrusted text in its context. Live-agent evaluations must include injection cases and measure overclaim or unauthorized-action behavior.

### Schema bypass and type confusion

**Threat:** malformed JSON, duplicate coordinates, unknown properties, non-finite numbers, or prototype-bearing objects alter execution.

**Controls:**

- boundary validators reject unknown and duplicate dimensions;
- finite protocols are checked against a declared schema;
- portable wrappers require exact fields;
- canonicalization rejects unsupported values such as `undefined`, functions, symbols, bigints, non-finite numbers, and non-plain objects;
- package endpoint cubes reject missing, duplicate, and outside-cube worlds.

**Residual risk:** JSON Schema files and TypeScript validators can drift. Tests must pin their shared constants and accepted examples.

### Resource exhaustion

**Threat:** a package declares an enormous protocol family or repeated-trial array.

**Controls:**

- exact static-grid and robust-witness utilities cap exposed dimensions;
- simulation utilities cap replications and trials per subset;
- WebMCP arrays and evidence sample limits are bounded;
- exact algorithms report planned/evaluated subset counts and reject budgets that cannot support a claimed proof.

**Residual risk:** even allowed worst-case limits can be expensive. Production ingestion should add byte-size, item-count, timeout, cancellation, and memory budgets before arbitrary packages are accepted from users.

### Stale experiment IDs and state races

**Threat:** an agent inspects evidence for an experiment from another session or receives a certificate after the investigation changed.

**Controls:**

- experiment IDs derive from immutable scientific inputs;
- the state registry maps IDs to exact requests;
- unknown IDs fail with a coded error;
- certificates are marked stale after relevant state changes;
- direction and selected candidate are bound into certificate v2;
- repeated identical experiments reuse deterministic results rather than creating ambiguous identities.

**Residual risk:** the current in-memory browser state is single-page and not a multi-user transaction system. A future network service needs session isolation, optimistic concurrency or transactional writes, expiry, and replay protection.

### Certificate substitution

**Threat:** a valid canonical certificate is returned for a different successful request, direction, publication pair, or evaluator.

**Controls:**

- certificate bodies bind direction, selected candidate, publications, protocol schema, evaluator descriptor, target, audit rows, and proof fields;
- scientific replay rebuilds the complete body and compares canonical bytes;
- application-state tests cover reverse-direction and non-minimum requests.

**Residual risk:** a verifier that accepts an attacker-chosen evaluator can replay attacker-chosen science. Callers must anchor expected evaluator and publication identities independently.

### Hash confusion

**Threat:** a user treats a matching SHA-256 digest as evidence that a publication is authentic or true.

**Controls:**

- UI and documentation call hashes content identities only;
- integrity and replay statuses are distinct;
- limitations are included in certificates and packages;
- no self-hash recursion is used.

**Residual risk:** authenticity requires signatures, attestations, transparency logs, or another external trust anchor. Those mechanisms authenticate identity/control, not scientific truth.

### Cross-site scripting and unsafe rendering

**Threat:** source metadata includes markup or script that executes in the browser.

**Controls:**

- React text interpolation escapes strings by default;
- no scientific path should use `dangerouslySetInnerHTML`;
- JSON diagnostics are rendered as text;
- source content is never compiled or evaluated.

**Residual risk:** future Markdown, rich evidence, file previews, or third-party widgets could introduce HTML parsing. Such features require sanitization, a restrictive content-security policy, and dedicated tests.

### Browser/WebMCP lifecycle abuse

**Threat:** duplicate registration, stale handlers, overprivileged operations, hidden side effects, or unsupported browser behavior confuses the agent or user.

**Controls:**

- registration is feature detected and guarded against duplicate module mounts;
- tool schemas use explicit enums and reject additional properties;
- annotations distinguish read-only from investigation-state-changing operations;
- handlers call the same application services as the human UI;
- no tool has network, filesystem, credential, or arbitrary-code parameters.

**Residual risk:** WebMCP remains browser/version dependent. Production compatibility and lifecycle behavior must be reverified against current official implementations and real agent sessions at the exact release revision.

### Supply-chain and workflow risk

**Threat:** dependency or GitHub Action changes alter builds or exfiltrate repository data.

**Controls:**

- dependency versions are locked;
- workflows use least-privilege read permissions unless a write is explicitly required;
- no project secrets are required;
- generated scientific artifacts are reproducible from source.

**Residual risk:** action tags such as major-version aliases are mutable and npm registries remain external trust dependencies. A higher-assurance release should pin action commit SHAs, produce an SBOM, record artifact attestations, and review dependency provenance.

## Agent authorization model

Current scientific tools mutate only local investigation history and certificate state. They do not publish, merge, spend money, communicate externally, or access private user data.

A future federated system must classify operations by effect:

- read publication metadata;
- run bounded evaluation work;
- access restricted evidence;
- publish or sign an artifact;
- spend compute budget;
- communicate with another origin.

Each new effect requires explicit authorization, audit logging, cancellation, and least-privilege credentials. It must not inherit trust merely because it is exposed as a semantic scientific tool.

## Verification map

Automated evidence should include:

- malformed and duplicate schema inputs;
- prototype/non-finite canonicalization rejection;
- stale and unknown experiment IDs;
- reverse-direction certificate substitution;
- rehashed scientific tampering;
- incomplete endpoint grids;
- oversized search/simulation requests;
- source-injection strings remaining inert data;
- HUMAN/AGENT result equivalence;
- absence of unsafe HTML rendering paths.

Actual prompt-injection resistance, browser lifecycle behavior, and agent authorization discipline require live execution and remain separate from unit-test evidence.

## Non-goals

The current system does not claim:

- publisher authentication;
- confidential-data handling;
- multi-tenant isolation;
- remote-code sandboxing;
- adversarial model-output containment beyond structured boundaries;
- cryptographic non-repudiation;
- production service availability.

Adding these claims would require a different architecture and dedicated security review.
