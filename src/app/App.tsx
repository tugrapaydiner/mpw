import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { dispute, runCounterfactual, inspectEvidence, witness } from "../engine/mpwService";
import { registerWebMcpTools } from "../webmcp/tools";
import { registerSmokeTool } from "../webmcp/smoke";
import { useSelection } from "../state/useSelection";
import { getSmokeState, subscribeSmoke, setSupported } from "../state/smokeStore";
import JsonBlock from "../components/JsonBlock";

export default function App() {
  const d = useMemo(() => dispute(), []);
  const { checked, toggle } = useSelection();
  const [out, setOut] = useState<{ counter?: unknown; evidence?: unknown; witness?: unknown }>({});
  const [note, setNote] = useState("checking for WebMCP…");
  const [busy, setBusy] = useState<string | null>(null);
  const smoke = useSyncExternalStore(subscribeSmoke, getSmokeState);

  useEffect(() => {
    registerWebMcpTools().then((r) => {
      setNote(r.registered.length ? `WebMCP: ${r.registered.length} tools registered` : "WebMCP not detected, ui still works");
      setSupported(r.registered.length > 0);
    });
    registerSmokeTool().then((r) => {
      if (r.registered.length) setSupported(true);
    });
  }, []);

  const run = (key: "counter" | "evidence" | "witness", fn: () => unknown) => {
    setBusy(key);
    setTimeout(() => {
      try {
        setOut((o) => ({ ...o, [key]: fn() }));
      } catch (e) {
        setOut((o) => ({ ...o, [key]: { error: String((e as Error).message || e) } }));
      }
      setBusy(null);
    }, 30);
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Minimal Protocol Witness</h1>
      <p>
        <strong>Demo outputs are synthetic and deterministic, not claims about real AI models.</strong> Scores,
        uncertainty, counterfactuals, witness verification, evidence hashes, and certificates are actually
        recomputed — execute the deterministic synthetic counterfactual evaluation.
      </p>
      <p>{note}</p>
      <h2>webmcp compatibility</h2>
      <p>
        {smoke.supported === null ? "checking…" : smoke.supported ? "Supported" : "unavailable"} · invocation
        count: {smoke.count}
        {smoke.lastMessage !== null ? ` · last invocation: ${smoke.lastMessage}` : ""}
      </p>
      {smoke.activity.length > 0 && <JsonBlock value={smoke.activity} />}
      <h2>dispute</h2>
      <JsonBlock value={d} />
      <h2>run a hybrid</h2>
      <div>
        {d.exposedDimensions.map((dim) => (
          <label key={dim} style={{ marginRight: "1rem" }}>
            <input type="checkbox" checked={checked.includes(dim)} onChange={() => toggle(dim)} /> {dim}
          </label>
        ))}
      </div>
      <button disabled={busy !== null} onClick={() => run("counter", () => runCounterfactual(checked))}>
        {busy === "counter" ? "running…" : "run counterfactual"}
      </button>
      <JsonBlock value={out.counter} />
      <h2>evidence</h2>
      <button disabled={busy !== null} onClick={() => run("evidence", () => inspectEvidence(checked, { limit: 5 }))}>
        {busy === "evidence" ? "running…" : "inspect evidence"}
      </button>
      <JsonBlock value={out.evidence} />
      <h2>verify a witness</h2>
      <button disabled={busy !== null} onClick={() => run("witness", () => witness(checked))}>
        {busy === "witness" ? "running…" : "verify current selection"}
      </button>
      <JsonBlock value={out.witness} />
    </main>
  );
}
