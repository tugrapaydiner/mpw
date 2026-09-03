import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getInvestigationState,
  subscribeInvestigation,
  readDispute,
  runCounterfactualOp,
  inspectEvidenceOp,
  verifyWitnessOp,
  resetInvestigation,
} from "../state/investigation";
import { registerWebMcpTools } from "../webmcp/tools";
import { useSelection } from "../state/useSelection";
import JsonBlock from "../components/JsonBlock";

export default function App() {
  const inv = useSyncExternalStore(subscribeInvestigation, getInvestigationState);
  const { checked, toggle } = useSelection();
  const [note, setNote] = useState("checking for WebMCP…");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    registerWebMcpTools().then((r) => {
      setNote(r.registered.length ? `WebMCP: ${r.registered.length} tools registered` : "WebMCP not detected, ui still works");
    });
  }, []);

  const run = (key: string, fn: () => void) => {
    setBusy(key);
    setTimeout(() => {
      fn();
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
      <p>
        status: {inv.status}
        {inv.error !== null ? ` · error: ${inv.error}` : ""}
      </p>
      <h2>dispute</h2>
      <button disabled={busy !== null} onClick={() => run("read", () => readDispute("HUMAN"))}>
        {busy === "read" ? "reading…" : "read dispute"}
      </button>
      {inv.dispute !== null && <JsonBlock value={{ dispute: inv.dispute, integrity: inv.integrity, differences: inv.differences }} />}
      <h2>run a hybrid</h2>
      <div>
        {(inv.dispute?.exposedDimensions ?? []).map((dim) => (
          <label key={dim} style={{ marginRight: "1rem" }}>
            <input type="checkbox" checked={checked.includes(dim)} onChange={() => toggle(dim)} /> {dim}
          </label>
        ))}
      </div>
      <button disabled={busy !== null} onClick={() => run("counter", () => runCounterfactualOp("HUMAN", { adopt: checked }))}>
        {busy === "counter" ? "running…" : "run counterfactual"}
      </button>
      {inv.selectedExperiment !== null && <JsonBlock value={inv.selectedExperiment} />}
      <h2>evidence</h2>
      <button
        disabled={busy !== null || inv.selectedExperiment === null}
        onClick={() =>
          run("evidence", () =>
            inspectEvidenceOp("HUMAN", { experimentId: inv.selectedExperiment?.experimentId, limit: 5 })
          )
        }
      >
        {busy === "evidence" ? "running…" : "inspect selected experiment"}
      </button>
      {inv.evidenceView !== null && <JsonBlock value={inv.evidenceView} />}
      <h2>verify a witness</h2>
      <button disabled={busy !== null} onClick={() => run("witness", () => verifyWitnessOp("HUMAN", { candidate: checked }))}>
        {busy === "witness" ? "running…" : "verify current selection"}
      </button>
      {inv.verification !== null && <JsonBlock value={{ verification: inv.verification, certificate: inv.certificate }} />}
      <h2>investigation</h2>
      <button disabled={busy !== null} onClick={() => run("reset", () => resetInvestigation("HUMAN"))}>
        {busy === "reset" ? "resetting…" : "reset investigation"}
      </button>
      <JsonBlock value={{ experiments: inv.experiments.length, activity: inv.activity }} />
    </main>
  );
}
