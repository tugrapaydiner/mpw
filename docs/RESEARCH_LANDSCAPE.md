# Research Landscape

This report is deliberately conservative. MPW combines established ideas in a useful domain-specific workflow; it does not claim to invent harness sensitivity, multiverse analysis, counterfactual explanation, minimal-set search, browser tools, or executable research artifacts.

## Problem evidence

Language-model evaluation is sensitive to implementation choices. HELM was motivated in part by sparse, non-overlapping, non-standardized model evaluations and made scenarios, metrics, prompts, and completions explicit. The lm-evaluation-harness authors later documented setup sensitivity and reproducibility failures from several years of practical evaluation work. Recent agent work strengthens the point: Harness-Bench evaluates model-harness configurations rather than attributing outcomes solely to a base model and records 5,194 trajectories across realistic workflows.

Primary sources:

- Liang et al., *Holistic Evaluation of Language Models*, TMLR 2023 / arXiv:2211.09110.
- Biderman et al., *Lessons from the Trenches on Reproducible Evaluation of Language Models*, arXiv:2405.14782.
- Yao et al., *Harness-Bench: Measuring Harness Effects across Models in Realistic Agent Workflows*, arXiv:2605.27922.
- Zhang et al., *Stop Comparing LLM Agents Without Disclosing the Harness*, arXiv:2605.23950. This is a position paper and should not be treated as settled causal evidence.

**Implication for MPW:** the motivating problem is credible, but a synthetic fixture alone cannot establish prevalence, effect size, or real-world utility.

## Model and harness effects

An evaluation result is better modeled as a property of a model, harness/protocol, benchmark, grader, and execution distribution than of a model alone. Prompt templates, parser behavior, retry policy, context construction, tool schemas, budgets, and implementation details can all alter results. MPW should therefore use the broader term **protocol coordinate** and reserve **harness** for execution-layer coordinates.

**Correction to earlier positioning:** not every protocol difference is a harness difference. Scoring rules, item filters, and statistical decision rules can sit outside the agent harness.

## Reproducibility

Reproducible computational research requires code, data, environment, and a runnable procedure—not a JSON hash alone. Whole Tale treats executable research objects as bundles of code, data, environment, narrative, and workflow. ReproZip captures the execution environment and dependencies. ACM artifact review distinguishes availability, functionality, reusability, and independent result validation.

Primary sources:

- Brinckman et al., *Computing Environments for Reproducibility: Capturing the Whole Tale*, Future Generation Computer Systems 2019, DOI 10.1016/j.future.2017.12.029.
- Rampin et al., *ReproZip: The Reproducibility Packer*, JOSS 2016, DOI 10.21105/joss.00107.
- ACM, *Artifact Review and Badging — Current*.
- NIST AI RMF 1.0 and the Generative AI Profile, NIST AI 100-1 and NIST AI 600-1.

**Implication for MPW:** call the current hash layer provenance/content integrity. Reserve “results reproduced” for an actual independent execution.

## Multiverse and specification-curve analysis

Multiverse analysis evaluates results across defensible data-processing choices; specification-curve analysis enumerates valid, non-redundant specifications, visualizes their outcomes, and performs joint inference. These are direct conceptual predecessors to protocol-space evaluation.

Primary sources:

- Steegen et al., *Increasing Transparency Through a Multiverse Analysis*, Perspectives on Psychological Science 2016, DOI 10.1177/1745691616658637.
- Simonsohn, Simmons, and Nelson, *Specification Curve Analysis*, Nature Human Behaviour 2020, DOI 10.1038/s41562-020-0912-z.

**What MPW adds:** a contrastive task anchored to two published endpoints and an optimization target over substitutions. **What it does not add:** the idea that analytic choices form a result multiverse or that joint inference is needed.

## Counterfactual explanations

Counterfactual explanation commonly asks for a small input change that changes a model output. Exact abductive explanations ask for sufficient feature subsets and distinguish subset-minimal from minimum-cardinality explanations. These concepts substantially overlap the MPW mathematical object.

Primary sources:

- Ignatiev, Narodytska, and Marques-Silva, *Abduction-Based Explanations for Machine Learning Models*, AAAI 2019 / arXiv:1811.10656.
- Gorji and Rubin, *Sufficient Reasons for Classifier Decisions in the Presence of Constraints*, AAAI 2022 / arXiv:2105.06001.
- Pawelczyk, Broelemann, and Kasneci, *On Counterfactual Explanations under Predictive Multiplicity*, UAI 2020.
- Hamman et al., *Robust Counterfactual Explanations for Neural Networks With Probabilistic Guarantees*, ICML 2023.

**Terminology judgment:** “Minimal Protocol Witness” is acceptable as a domain-specific product/research label if every formal definition states whether minimal means cardinality, cost, or inclusion. It is misleading if presented as a new general formal concept or a causal witness.

## Minimal explanation sets and search

SAT/MaxSAT, MUS/MCS, prime-implicant, and minimal-set research provides mature terminology and algorithms when the sufficiency predicate has logical or monotone structure. Marques-Silva and Janota unify many problems as minimal sets over monotone predicates. That machinery cannot be imported blindly because MPW categorical sufficiency can be non-monotone.

Primary sources:

- Marques-Silva and Janota, *Computing Minimal Sets on Propositional Formulae I: Problems & Reductions*, arXiv:1402.3011.
- Marques-Silva, Janota, and Belov, *Minimal Sets over Monotone Predicates in Boolean Formulae*, CAV 2013, DOI 10.1007/978-3-642-39799-8_39.
- Liffiton et al., *Fast, Flexible MUS Enumeration*, Constraints 2016, DOI 10.1007/s10601-015-9183-0.

**Algorithmic conclusion:** for an arbitrary non-monotone black-box conclusion map, exact search has exponential worst-case query complexity. SAT/SMT or branch-and-bound helps only when additional structure is represented and proven. The honest baseline is cardinality-layer enumeration with explicit proof status and limits.

## Statistical inference

The canonical paired bootstrap estimates an effect difference under item resampling with fixed stratum counts. Exact McNemar/binomial analysis of discordant pairs answers a complementary null question about marginal equality for paired binary outcomes. Neither automatically solves post-selection inference over many protocol subsets.

Specification-curve analysis explicitly calls for joint inference across specifications. Resampling-based max-statistic and Romano-Wolf procedures are established approaches for familywise error control under multiple testing and dependent statistics.

Primary sources:

- Romano and Wolf, *Stepwise Multiple Testing as Formalized Data Snooping*, Econometrica 2005, DOI 10.1111/j.1468-0262.2005.00615.x.
- Westfall, *On Using the Bootstrap for Multiple Comparisons*, Journal of Biopharmaceutical Statistics 2011, DOI 10.1080/10543406.2011.607751.
- Simonsohn et al., *Specification Curve Analysis*, 2020.

**Implication for MPW:** a pointwise 95% CI per subset is fine as a fixed-subset descriptive interval. It is not a 95% confidence guarantee for an adaptively selected minimum witness. The project should implement simultaneous bands or keep its witness claim explicitly deterministic and finite-benchmark conditional.

## Scientific verification and executable artifacts

Executable papers, reproducible environments, evidence graphs, and research agents are active areas with substantial prior work. MPW’s certificate should be positioned as a domain-specific replay record, not as the invention of machine-verifiable science.

The strongest artifact should allow a second implementation to validate the schema, evidence identities, transformations, statistical outputs, and minimum-set proof without trusting the UI.

## Agent-native research and WebMCP

WebMCP is a Web Machine Learning Community Group draft, not a stable cross-browser standard. The current draft exposes imperative tools under `document.modelContext`, supports registration lifecycle via `AbortController`, and continues to discuss output schemas, cross-document behavior, permissions, and security. Chrome describes it as an experimental/origin-trial technology. OpenAI Site Tools currently use WebMCP in the ChatGPT desktop app’s built-in browser and are page-scoped.

Official sources:

- Web Machine Learning Community Group, *WebMCP* draft and explainer.
- Chrome for Developers, *Reliable agent calls with WebMCP*, *Evals for WebMCP*, and *Agent security considerations for WebMCP* (2026).
- OpenAI Help Center, *Using site tools in the ChatGPT desktop app* (2026).

Security guidance identifies malicious tool metadata and contaminated tool outputs as prompt-injection vectors. A scientific site must treat publisher strings and evidence text as untrusted data, keep tool descriptions static, restrict parameter size, and avoid granting tools broader authority than the visible workflow.

**WebMCP contribution judgment:** semantic scientific operations are genuinely better than brittle DOM actuation for this workflow. The project has not yet measured that advantage against a DOM-only baseline or across real agents.

## Direct competitors and adjacent systems

No single reviewed system was found that exactly combines two-endpoint evaluation reconciliation, finite protocol substitution, exact minimum-cardinality witness recovery, browser-native scientific tools, and a replay artifact. That absence does not prove novelty.

Closest categories are:

1. evaluation harnesses and harness-effect benchmarks;
2. multiverse/specification-curve systems;
3. counterfactual and abductive explainers;
4. executable/reproducible research environments;
5. agent-native research artifacts and browser tool interfaces.

A direct competitor search remains incomplete until the project is compared on real publication packages and the WebMCP ecosystem matures.

## What this project does not invent

- evaluation-protocol sensitivity;
- model-by-harness interaction;
- multiverse/specification-curve analysis;
- counterfactual explanations;
- minimum-cardinality or minimum-cost explanations;
- exhaustive subset enumeration;
- paired bootstrap or exact paired tests;
- SHA-256/JCS provenance;
- executable research artifacts;
- browser or MCP tool calling.

## What may be a useful contribution

The plausible contribution is a **reconciliation task and artifact format**:

> Given two replayable evaluation publications with a declared finite protocol schema and incompatible conclusions, compute and verify all globally minimum substitutions that reproduce the target conclusion, expose controlled experiments to both humans and browser agents, and emit a replayable reconciliation record.

This is best described as a new synthesis and operationalization. It becomes research-worthy only if validated on a diverse benchmark and, eventually, real evaluation publications.

## Open research questions

The central unresolved questions are selection-aware witness inference, exact search under non-monotone stochastic conclusions, schema alignment across publications, causal interpretation, federated verification, and adversarial publisher behavior. They are developed in `OPEN_RESEARCH_QUESTIONS.md`.
