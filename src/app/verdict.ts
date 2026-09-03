// verdict wording. exact strings are part of the product contract and are
// pinned by tests/app/verdict.test.ts (banned-phrase scan).
export function experimentVerdict(r: { subset: string[]; reproducesTarget: boolean }): string {
  if (r.subset.length === 0) return "No change applied; baseline result.";
  if (r.reproducesTarget) return "Target conclusion reproduced.";
  return "Effect detected; target conclusion not reproduced.";
}

export function subsetsLine(v: { subsetsTotal: number }): string {
  return `${v.subsetsTotal} / ${v.subsetsTotal} exposed protocol subsets evaluated`;
}

const prettyStratum = (s: string): string => s.replace(/-/g, " ");
const fmtDelta = (x: number): string => {
  const r = Math.round(x * 10000) / 10000;
  return (r > 0 ? "+" : "") + String(r);
};

// deterministic secondary insight from category diagnostics only.
// names the largest measured category shift; claims no cause.
export function categoryInsight(
  categories: Array<{ stratum: string; n: number; accA: number; accB: number }>,
  overallDelta: number
): string | null {
  let best: { stratum: string; delta: number } | null = null;
  for (const c of categories) {
    if (!c || c.n <= 0) continue;
    const delta = c.accA - c.accB;
    if (best === null || Math.abs(delta) > Math.abs(best.delta)) best = { stratum: c.stratum, delta };
  }
  if (best === null) return null;
  if (Math.abs(best.delta) - Math.abs(overallDelta) < 0.02) return null;
  return `Largest measured shift in ${prettyStratum(best.stratum)} (Δ ${fmtDelta(best.delta)} vs overall Δ ${fmtDelta(overallDelta)}).`;
}
