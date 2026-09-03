// generates canonical fixture artifacts. raw counts only, no CIs, no hashes.
import { mkdirSync, writeFileSync } from "node:fs";
import { buildBenchmarkItems, listAllProtocolCombinations, EXPOSED_DIMENSIONS } from "../src/engine/mpwFixture.js";
import { simulateItem, SIM_SEED, SIM_VERSION } from "../src/engine/mpwSimulator.js";
import { buildPublicationManifestCore, protocolKey } from "../src/engine/mpwManifest.js";
import type { JsonValue } from "../src/engine/mpwManifest.js";

const out = (p: string) => new URL(`../data/generated/${p}`, import.meta.url);
mkdirSync(out("."), { recursive: true });

const combos = listAllProtocolCombinations();
const keys = combos.map((c) => protocolKey(c.protocol as unknown as Record<string, JsonValue>));
if (new Set(keys).size !== 16) throw new Error("protocols not unique");

function rawCounts(subset: string[]) {
  const items = buildBenchmarkItems();
  const combo = combos.find((c) => c.subset.join(",") === [...subset].sort().join(","));
  if (!combo) throw new Error("unknown subset");
  let a = 0;
  let b = 0;
  for (const it of items) {
    if (simulateItem("MODEL_A", it, combo.protocol).finalCorrect) a++;
    if (simulateItem("MODEL_B", it, combo.protocol).finalCorrect) b++;
  }
  return { n: items.length, accA: a / items.length, accB: b / items.length };
}

function coreFor(source: string, subset: string[]) {
  const combo = combos.find((c) => c.subset.join(",") === [...subset].sort().join(","));
  if (!combo) throw new Error("unknown subset");
  const counts = rawCounts(subset);
  const declared = counts.accA > counts.accB ? "MODEL_A" : counts.accB > counts.accA ? "MODEL_B" : "INCONCLUSIVE";
  return buildPublicationManifestCore({
    source,
    protocol: combo.protocol as unknown as Record<string, JsonValue>,
    declared,
    seeds: { sim: SIM_SEED, generator: SIM_VERSION } as unknown as Record<string, JsonValue>,
    evidence: null,
  });
}

const full = process.argv.includes("--full");

type Receipt = Record<string, unknown>;
const labA = coreFor("Lab A", []);
const labB = coreFor("Lab B", [...EXPOSED_DIMENSIONS]);
writeFileSync(out("lab-a.core.json"), JSON.stringify({ ...labA, provisional: true, ci: null }, null, 2));
writeFileSync(out("lab-b.core.json"), JSON.stringify({ ...labB, provisional: true, ci: null }, null, 2));

let total = 0;
if (full) {
  const receipts: Receipt[] = [];
  const items = buildBenchmarkItems();
  for (const c of combos) {
    for (const it of items) {
      for (const model of ["MODEL_A", "MODEL_B"]) {
        const r = simulateItem(model as "MODEL_A", it, c.protocol);
        receipts.push({ protocol: protocolKey(c.protocol as unknown as Record<string, JsonValue>), ...r });
        total++;
      }
    }
  }
  writeFileSync(out("receipts.json"), JSON.stringify(receipts));
}

console.log(JSON.stringify({ protocols: combos.length, receipts: total || 16 * 400 * 2, labA: labA.declared, labB: labB.declared }));
