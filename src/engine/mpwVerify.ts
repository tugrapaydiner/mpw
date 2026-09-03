// full-16 canonical verifier, no answer literals
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  SOURCE_PUBLICATIONS,
  listAllProtocolCombinations,
} from "./mpwFixture.js";
import type { SourcePublication } from "./mpwFixture.js";
import { evaluateSubset, conclusionForSubset } from "./mpwSimulator.js";
import type { Protocol, Subset, WitnessStatus } from "../types";

export interface IntegrityError extends Error {
  code: string;
  checks: IntegrityCheck[];
}

export interface IntegrityCheck {
  source: string;
  declared: string;
  recomputed: string;
  match: boolean;
}

// each source must reproduce its own headline first, else integrity failure
export function checkSourceIntegrity(declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {
  const checks: IntegrityCheck[] = declarations.map((d) => {
    const recomputed = conclusionForSubset([...d.subset]);
    return { source: d.source, declared: d.declared, recomputed, match: recomputed === d.declared };
  });
  const bad = checks.filter((c) => !c.match);
  if (bad.length) {
    const err = new Error(`SOURCE_INTEGRITY_FAILURE: ${bad.map((b) => b.source).join(", ")}`) as IntegrityError;
    err.code = "SOURCE_INTEGRITY_FAILURE";
    err.checks = checks;
    throw err;
  }
  return { status: "OK", checks };
}

function checkHybrid(subset: Subset, protocol: Protocol): void {
  for (const d of EXPOSED_DIMENSIONS) {
    const want = subset.includes(d) ? LAB_B_PROTOCOL[d as keyof Protocol] : LAB_A_PROTOCOL[d as keyof Protocol];
    if (protocol[d as keyof Protocol] !== want) throw new Error(`hybrid mismatch on ${d}`);
  }
}

export function verifyCanonical(declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {
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
  const minimumWitnesses =
    minimumCardinality === null ? [] : sufficient.filter((s) => s.length === minimumCardinality).map((s) => [...s]);
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
export function verifyWitness({
  candidateSubset,
  exposedDimensions,
  isSufficient,
}: {
  candidateSubset: Subset;
  exposedDimensions: Subset;
  isSufficient: (subset: Subset) => boolean;
}): {
  status: WitnessStatus;
  minimumCardinality: number | null;
  minimumWitnesses: Subset[];
  coMinimumWitnesses: Subset[];
  checkedCount: number;
  totalSubsets: number;
  exhaustive: boolean;
} {
  if (!Array.isArray(candidateSubset) || !Array.isArray(exposedDimensions))
    throw new Error("candidateSubset and exposedDimensions must be arrays");
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  const n = exposedDimensions.length;
  if (n > 20) throw new Error("too many dims for exhaustive check");
  const totalSubsets = 2 ** n;
  const sufficient: Subset[] = [];
  for (let mask = 0; mask < totalSubsets; mask++) {
    const s: Subset = [];
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
  const minimumCardinality: number = Math.min(...sufficient.map((s) => s.length));
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

export function verifyCandidateWitness(candidateSubset: Subset, declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {
  checkSourceIntegrity(declarations);
  const full = [...EXPOSED_DIMENSIONS];
  const target = conclusionForSubset(full);
  return verifyWitness({
    candidateSubset: [...candidateSubset],
    exposedDimensions: full,
    isSufficient: (s) => conclusionForSubset(s) === target,
  });
}
