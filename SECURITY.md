# Security Policy

## Supported code

Security reports should target the current `main` branch or an explicitly identified active research branch and commit. Historical phase snapshots and generated demonstration artifacts are not independently supported releases.

## Reporting a vulnerability

Do not publish an exploit or sensitive report in a public issue before maintainers have had a reasonable opportunity to assess it.

Use GitHub's private vulnerability-reporting feature when enabled for this repository. Include:

- affected commit or release;
- affected file and operation;
- threat model and preconditions;
- minimal reproduction;
- observed versus expected behavior;
- impact on scientific correctness, content integrity, agent authorization, confidentiality, or availability;
- suggested mitigation when known.

Do not include real secrets, private evaluation data, or credentials in a reproduction.

## High-priority report classes

Examples include:

- certificate or package verification accepting altered scientific content;
- direction/candidate/publication substitution across valid certificates;
- protocol-schema bypass or hidden-coordinate injection;
- unsafe HTML or script execution from publication metadata;
- prompt text being promoted into tool instructions;
- stale experiment IDs crossing investigation boundaries;
- unbounded work from small malicious inputs;
- WebMCP operations gaining undeclared side effects or privileges;
- canonicalization inconsistencies that create identity collisions;
- source or artifact paths exposing private data;
- dependency or workflow compromise affecting published artifacts.

A disagreement about statistical assumptions or research interpretation may be better filed as a scientific issue, but security-relevant misrepresentation of verification level is in scope.

## Trust boundary

MPW content hashes establish content identity relative to a known digest. They do not authenticate publishers, establish truth, prove causality, or protect against a party that can replace both content and expected digest.

Scientific replay is also conditional on the verifier trusting the expected evaluator and publication identities.

See `docs/SECURITY_MODEL.md` for the complete threat model, controls, residual risks, and non-goals.

## Current non-goals

The repository is not currently a multi-tenant service and does not claim:

- storage of confidential evaluation data;
- remote-code sandboxing;
- production authentication or authorization;
- publisher signatures or non-repudiation;
- service-level availability;
- safe execution of arbitrary uploaded evaluators.

Features introducing those capabilities require a dedicated security design before deployment.
