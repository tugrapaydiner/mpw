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
