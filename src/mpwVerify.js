// full-16 canonical verifier, no answer literals
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  SOURCE_PUBLICATIONS,
  listAllProtocolCombinations,
} from "./mpwFixture.js";
import { evaluateSubset, conclusionForSubset } from "./mpwSimulator.js";

// each source must reproduce its own headline first, else integrity failure
export function checkSourceIntegrity(declarations = SOURCE_PUBLICATIONS) {
  const checks = declarations.map((d) => {
    const recomputed = conclusionForSubset([...d.subset]);
    return { source: d.source, declared: d.declared, recomputed, match: recomputed === d.declared };
  });
  const bad = checks.filter((c) => !c.match);
  if (bad.length) {
    const err = new Error(`SOURCE_INTEGRITY_FAILURE: ${bad.map((b) => b.source).join(", ")}`);
    err.code = "SOURCE_INTEGRITY_FAILURE";
    err.checks = checks;
    throw err;
  }
  return { status: "OK", checks };
}

function checkHybrid(subset, protocol) {
  for (const d of EXPOSED_DIMENSIONS) {
    const want = subset.includes(d) ? LAB_B_PROTOCOL[d] : LAB_A_PROTOCOL[d];
    if (protocol[d] !== want) throw new Error(`hybrid mismatch on ${d}`);
  }
}

export function verifyCanonical(declarations = SOURCE_PUBLICATIONS) {
  checkSourceIntegrity(declarations);
  const full = [...EXPOSED_DIMENSIONS];
  const target = conclusionForSubset(full);
  const base = conclusionForSubset([]);
  const table = listAllProtocolCombinations().map(({ subset, protocol }) => {
    checkHybrid(subset, protocol);
    const ev = evaluateSubset(subset);
    return {
      subset: [...subset],
      accA: ev.stats.accA,
      accB: ev.stats.accB,
      mean: ev.stats.mean,
      ciLow: ev.stats.ciLow,
      ciHigh: ev.stats.ciHigh,
      conclusion: ev.conclusion,
      sufficient: ev.conclusion === target,
    };
  });
  const sufficient = table.filter((r) => r.sufficient).map((r) => [...r.subset]);
  const minimumCardinality = sufficient.length ? Math.min(...sufficient.map((s) => s.length)) : null;
  const minimumWitnesses = sufficient.filter((s) => s.length === minimumCardinality).map((s) => [...s]);
  return {
    base,
    target,
    table,
    sufficient,
    minimumCardinality,
    minimumWitnesses,
    coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
    checkedCount: table.length,
    totalSubsets: 2 ** full.length,
    exhaustive: table.length === 2 ** full.length,
  };
}

// generic candidate check over any exposed set, never forces an answer
export function verifyWitness({ candidateSubset, exposedDimensions, isSufficient }) {
  if (!Array.isArray(candidateSubset) || !Array.isArray(exposedDimensions))
    throw new Error("candidateSubset and exposedDimensions must be arrays");
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  const n = exposedDimensions.length;
  if (n > 20) throw new Error("too many dims for exhaustive check");
  const totalSubsets = 2 ** n;
  const sufficient = [];
  for (let mask = 0; mask < totalSubsets; mask++) {
    const s = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(exposedDimensions[i]);
    const v = isSufficient([...s]);
    if (typeof v !== "boolean") throw new Error("isSufficient must return a boolean");
    if (v) sufficient.push(s);
  }
  if (!sufficient.length)
    return {
      status: "UNRESOLVED",
      minimumCardinality: null,
      minimumWitnesses: [],
      coMinimumWitnesses: [],
      checkedCount: totalSubsets,
      totalSubsets,
      exhaustive: true,
    };
  const minimumCardinality = Math.min(...sufficient.map((s) => s.length));
  const minimumWitnesses = sufficient.filter((s) => s.length === minimumCardinality).map((s) => [...s]);
  const cand = [...candidateSubset].sort();
  if (!cand.every((d) => exposedDimensions.includes(d))) throw new Error("unknown candidate dim");
  const candSufficient = isSufficient([...cand]);
  if (!candSufficient)
    return {
      status: "NOT_SUFFICIENT",
      minimumCardinality,
      minimumWitnesses: minimumWitnesses.map((s) => [...s]),
      coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
      checkedCount: totalSubsets + 1,
      totalSubsets,
      exhaustive: true,
    };
  if (cand.length > minimumCardinality)
    return {
      status: "NON_MINIMUM",
      minimumCardinality,
      minimumWitnesses: minimumWitnesses.map((s) => [...s]),
      coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
      checkedCount: totalSubsets + 1,
      totalSubsets,
      exhaustive: true,
    };
  return {
    status: "VERIFIED",
    minimumCardinality,
    minimumWitnesses: minimumWitnesses.map((s) => [...s]),
    coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
    checkedCount: totalSubsets + 1,
    totalSubsets,
    exhaustive: true,
  };
}

export function verifyCandidateWitness(candidateSubset, declarations = SOURCE_PUBLICATIONS) {
  checkSourceIntegrity(declarations);
  const full = [...EXPOSED_DIMENSIONS];
  const target = conclusionForSubset(full);
  return verifyWitness({
    candidateSubset: [...candidateSubset],
    exposedDimensions: full,
    isSufficient: (s) => conclusionForSubset(s) === target,
  });
}
