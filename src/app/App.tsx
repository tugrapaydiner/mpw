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
import { buildCertificate, verifyCertificate, LIMITATIONS } from "../engine/mpwCertificate";
import { registerWebMcpTools } from "../webmcp/tools";
import { useSelection } from "../state/useSelection";
import { experimentVerdict, subsetsLine } from "./verdict";
import JsonBlock from "../components/JsonBlock";

const DIM_LABEL: Record<string, string> = {
  reasoning_budget: "Reasoning budget",
  answer_parser: "Answer parser",
  retry_policy: "Retry",
  tool_access: "Tool access",
};

const tag = (source: string) => {
  const bg = source === "AGENT" ? "#e8def8" : source === "SYSTEM" ? "#e2e3e5" : "#cfe2ff";
  return (
    <span style={{ background: bg, padding: "0 6px", borderRadius: 4, fontSize: 12 }}>{source}</span>
  );
};

export default function App() {
  const inv = useSyncExternalStore(subscribeInvestigation, getInvestigationState);
  const { checked, toggle } = useSelection();
  const [note, setNote] = useState("checking for WebMCP…");
  const [busy, setBusy] = useState<string | null>(null);
  const [certMsg, setCertMsg] = useState<string | null>(null);

  useEffect(() => {
    registerWebMcpTools().then((r) => {
      setNote(
        r.registered.length
          ? `WebMCP: ${r.registered.length} tools registered`
          : "WebMCP not detected — manual app fully functional"
      );
    });
    readDispute("HUMAN");
  }, []);

  const run = (key: string, fn: () => void) => {
    setBusy(key);
    setTimeout(() => {
      fn();
      setBusy(null);
    }, 30);
  };

  const labA = inv.dispute?.sources.find((s) => s.lab === "A") ?? null;
  const labB = inv.dispute?.sources.find((s) => s.lab === "B") ?? null;
  const exp = inv.selectedExperiment;
  const verifyAsk = [...(inv.activity ?? [])]
    .reverse()
    .find((e) => e.op === "VERIFY_WITNESS" && e.source !== "SYSTEM")?.source;

  const downloadCertificate = () => {
    try {
      const wrapper = buildCertificate();
      verifyCertificate(wrapper);
      const blob = new Blob([JSON.stringify(wrapper, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${wrapper.certificateId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setCertMsg(`downloaded ${wrapper.certificateId} (verifier: VALID)`);
    } catch (e) {
      setCertMsg(`download blocked: ${String((e as Error).message || e)}`);
    }
  };

  const copyCertificate = () => {
    try {
      const wrapper = buildCertificate();
      verifyCertificate(wrapper);
      const clip = navigator.clipboard;
      if (!clip) {
        setCertMsg("copy unavailable in this browser");
        return;
      }
      void clip.writeText(JSON.stringify(wrapper, null, 2)).then(
        () => setCertMsg(`copied ${wrapper.certificateId} (verifier: VALID)`),
        () => setCertMsg("copy unavailable in this browser")
      );
    } catch (e) {
      setCertMsg(`copy blocked: ${String((e as Error).message || e)}`);
    }
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Minimal Protocol Witness</h1>
      <p>
        <strong>SAME BENCHMARK.</strong> <strong>SAME TWO MODELS.</strong>{" "}
        <strong>OPPOSITE ESTABLISHED CONCLUSIONS.</strong>
      </p>
      <p>
        <strong>Synthetic evaluation reports, not real model measurements.</strong> Every number below is
        recomputed by the deterministic engine when you act.
      </p>
      <p>{note}</p>
      <p>
        status: {inv.status}
        {inv.error !== null ? ` · error: ${inv.error}` : ""}
      </p>

      {inv.dispute !== null && labA !== null && labB !== null && (
        <>
          <div style={{ display: "flex", gap: "1rem" }}>
            {[
              { title: "LAB A", s: labA },
              { title: "LAB B", s: labB },
            ].map(({ title, s }) => (
              <section key={title} style={{ flex: 1, border: "1px solid #ccc", padding: "0.5rem 1rem" }}>
                <h2>{title}</h2>
                <p>
                  MODEL_A {s.scoreA} / MODEL_B {s.scoreB}
                </p>
                <p>
                  delta {s.delta} · CI [{s.ciLow}, {s.ciHigh}]
                </p>
                <p>
                  <strong>{s.conclusion}</strong> · coverage {s.coverage}
                </p>
              </section>
            ))}
          </div>
          <h2>protocol differences</h2>
          <ul>
            {(inv.differences ?? []).map((d) => (
              <li key={d}>
                {DIM_LABEL[d] ?? d}: {String((inv.dispute?.labA as Record<string, unknown>)[d])} ↔{" "}
                {String((inv.dispute?.labB as Record<string, unknown>)[d])}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>controlled test</h2>
      <div>
        {(inv.dispute?.exposedDimensions ?? []).map((dim) => (
          <label key={dim} style={{ marginRight: "1rem" }}>
            <input type="checkbox" checked={checked.includes(dim)} onChange={() => toggle(dim)} /> {dim}
          </label>
        ))}
      </div>
      <button disabled={busy !== null} onClick={() => run("counter", () => runCounterfactualOp("HUMAN", { adopt: checked }))}>
        {busy === "counter" ? "running…" : "run counterfactual"}
      </button>{" "}
      <button
        disabled={busy !== null || exp === null}
        onClick={() => run("evidence", () => inspectEvidenceOp("HUMAN", { experimentId: exp?.experimentId, limit: 5 }))}
      >
        {busy === "evidence" ? "running…" : "inspect evidence"}
      </button>{" "}
      <button disabled={busy !== null} onClick={() => run("witness", () => verifyWitnessOp("HUMAN", { candidate: checked }))}>
        {busy === "witness" ? "running…" : "verify candidate"}
      </button>{" "}
      <button disabled={busy !== null} onClick={() => run("reset", () => resetInvestigation("HUMAN"))}>
        {busy === "reset" ? "resetting…" : "reset"}
      </button>

      {exp !== null && (
        <section style={{ border: "1px solid #ccc", padding: "0.5rem 1rem", marginTop: "1rem" }}>
          <h3>CONTROLLED TEST</h3>
          {exp.subset.length === 0 ? (
            <p>Baseline: no changes applied.</p>
          ) : (
            <ul>
              {exp.subset.map((d) => (
                <li key={d}>
                  {DIM_LABEL[d] ?? d}: {String((inv.dispute?.labA as Record<string, unknown>)[d])} →{" "}
                  {String((inv.dispute?.labB as Record<string, unknown>)[d])}
                </li>
              ))}
            </ul>
          )}
          <p>Everything else held constant.</p>
          <p>
            MODEL_A {exp.accA} / MODEL_B {exp.accB} · delta {exp.mean} · CI [{exp.ciLow}, {exp.ciHigh}] ·{" "}
            <strong>{exp.conclusion}</strong> · coverage {exp.coverage}
          </p>
          <p>
            <strong>{experimentVerdict(exp)}</strong>
          </p>
        </section>
      )}

      {inv.evidenceView !== null && (
        <section>
          <h3>evidence diagnostics</h3>
          <JsonBlock
            value={{
              pairedCounts: inv.evidenceView.pairedCounts,
              parserFailures: inv.evidenceView.parserFailures,
              retry: inv.evidenceView.retry,
              tool: inv.evidenceView.tool,
              categorySummary: inv.evidenceView.categorySummary,
              evidenceHash: inv.evidenceView.evidenceHash,
            }}
          />
        </section>
      )}

      {inv.verification !== null && (
        <section>
          <h3>verification</h3>
          <p>
            {subsetsLine({ subsetsTotal: inv.verification.totalSubsets })}
            {inv.verification.status === "VERIFIED" ? ` (+${inv.verification.checkedCount - inv.verification.totalSubsets} candidate check)` : ""}
          </p>
          <p>
            status <strong>{inv.verification.status}</strong> · minimum cardinality{" "}
            {String(inv.verification.minimumCardinality)} · witness(es){" "}
            {inv.verification.coMinimumWitnesses.map((w) => w.join("+") || "∅").join(", ")}
          </p>
          <p>
            requested by {tag(verifyAsk ?? "HUMAN")} · exhaustively verified by {tag("SYSTEM")}
          </p>
        </section>
      )}

      {inv.certificate !== null && (
        <section style={{ border: "1px solid #ccc", padding: "0.5rem 1rem", marginTop: "1rem" }}>
          <h3>certificate</h3>
          <p>
            id <strong>{inv.certificate.certificateId}</strong>
          </p>
          <p>content hash {inv.certificate.certificateHash}</p>
          <p>
            status {inv.certificate.status} · valid {String(inv.certificate.valid)}
          </p>
          <ul>
            {LIMITATIONS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <button disabled={busy !== null} onClick={() => run("copy", copyCertificate)}>
            copy JSON
          </button>{" "}
          <button disabled={busy !== null} onClick={() => run("download", downloadCertificate)}>
            download JSON
          </button>
          {certMsg !== null && <p>{certMsg}</p>}
        </section>
      )}

      <h2>investigation trace</h2>
      <ul>
        {inv.experiments.map((e) => (
          <li key={e.experimentId}>
            {e.subset.join("+") || "baseline"} → <strong>{e.conclusion}</strong>
            {e.experimentId === exp?.experimentId ? " (selected)" : ""}
          </li>
        ))}
      </ul>
      <h2>activity</h2>
      <ul>
        {inv.activity.map((e) => (
          <li key={e.seq}>
            #{e.seq} {tag(e.source)} {e.op} — {e.detail}
          </li>
        ))}
      </ul>
    </main>
  );
}
