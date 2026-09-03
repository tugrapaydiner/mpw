// shared narrow types for the engine. no any, no unknown blobs.
export type Dim = string;
export type Subset = Dim[];
export type Conclusion = "MODEL_A" | "MODEL_B" | "INCONCLUSIVE";
export type LegacyConclusion = "B>B" | "A>B" | "inconclusive";
export type WitnessStatus = "VERIFIED" | "NOT_SUFFICIENT" | "NON_MINIMUM" | "UNRESOLVED";

export interface Outcome {
  id: string;
  stratum?: string;
  a: 0 | 1;
  b: 0 | 1;
  diff: number;
}

export interface Protocol {
  reasoning_budget: number;
  answer_parser: string;
  retry_policy: string;
  tool_access: string;
  [k: string]: string | number;
}

export interface BenchmarkItem {
  id: string;
  stratum: string;
  indexInStratum: number;
  globalIndex: number;
}

export interface Stats {
  n: number;
  accA: number;
  accB: number;
  mean: number;
  ciLow: number;
  ciHigh: number;
  replicates: number;
  seed: string;
  method: string;
}

export interface JsonSchema {
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  items?: unknown;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean };
  execute: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}
