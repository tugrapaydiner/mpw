import { useState } from "react";

export function useSelection() {
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (dim: string) =>
    setChecked((c) => (c.includes(dim) ? c.filter((x) => x !== dim) : [...c, dim]));
  return { checked, toggle };
}
