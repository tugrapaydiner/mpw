// phase-boundary map data. every cell is one freshly evaluated protocol
// subset — discrete cells only, no interpolation anywhere.
import { verifyCanonical } from "../engine/mpwVerify";

export interface PhaseCell {
  subset: string[];
  cardinality: number;
  conclusion: string;
  sufficient: boolean;
  isMinimum: boolean;
}

export function buildPhaseCells(): PhaseCell[] {
  const v = verifyCanonical();
  const minSet = new Set(v.minimumWitnesses.map((s) => [...s].sort().join("+")));
  return v.table.map((r) => ({
    subset: [...r.subset],
    cardinality: r.subset.length,
    conclusion: r.conclusion,
    sufficient: r.sufficient,
    isMinimum: minSet.has([...r.subset].sort().join("+")),
  }));
}
