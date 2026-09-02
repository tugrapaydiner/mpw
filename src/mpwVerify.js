// full-16 canonical verifier, no answer literals
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  listAllProtocolCombinations,
} from "./mpwFixture.js";
import { evaluateSubset, conclusionForSubset } from "./mpwSimulator.js";

function checkHybrid(subset, protocol) {
  for (const d of EXPOSED_DIMENSIONS) {
    const want = subset.includes(d) ? LAB_B_PROTOCOL[d] : LAB_A_PROTOCOL[d];
    if (protocol[d] !== want) throw new Error(`hybrid mismatch on ${d}`);
  }
}

export function verifyCanonical() {
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
