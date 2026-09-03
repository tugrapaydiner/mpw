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
import { experimentVerdict, subsetsLine, categoryInsight } from "./verdict";
import JsonBlock from "../components/JsonBlock";

const DIM_LABEL: Record<string, string> = {
  reasoning_budget: "Reasoning budget",
  answer_parser: "Answer parser",
  retry_policy: "Retry",
  tool_access: "Tool access",
};

function SourceTag({ source }: { source: string }) {
  const cls = source === "AGENT" ? "mpw-tag mpw-tag-a" : source === "SYSTEM" ? "mpw-tag mpw-tag-s" : "mpw-tag mpw-tag-h";
  return (
    <span className={cls} aria-label={`event source ${source}`}>
      ◆ {source}
    </span>
  );
}

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
  const insight =
    inv.evidenceView !== null
      ? categoryInsight(
          inv.evidenceView.categorySummary,
          inv.evidenceView.categorySummary.reduce((s, c) => s + ((c.accA - c.accB) * c.n) / 400, 0)
        )
      : null;

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
    <main className="mpw">
      <a className="mpw-skip" href="#investigation">
        Skip to investigation
      </a>
      <header className="mpw-masthead">
        <p className="mpw-overline">Deterministic evaluation record</p>
        <h1>Minimal Protocol Witness</h1>
      </header>
      <section className="mpw-banner" aria-label="The contradiction">
        <p>
          <strong>SAME BENCHMARK.</strong> <strong>SAME TWO MODELS.</strong>{" "}
          <strong>OPPOSITE ESTABLISHED CONCLUSIONS.</strong>
        </p>
        <p className="mpw-muted">
          Synthetic evaluation reports, not real model measurements. Every number below is recomputed by the
          deterministic engine when you act.
        </p>
      </section>
      <p role="status">{note}</p>
      <p role="status" aria-live="polite">
        status: {busy !== null ? <span className="mpw-busy">{inv.status}…</span> : inv.status}
        {inv.error !== null ? ` · error: ${inv.error}` : ""}
      </p>

      {inv.dispute !== null && labA !== null && labB !== null && (
        <>
          <div className="mpw-grid">
            {[
              { title: "LAB A", s: labA, cls: "mpw-card mpw-labA" },
              { title: "LAB B", s: labB, cls: "mpw-card mpw-labB" },
            ].map(({ title, s, cls }) => (
              <section key={title} className={cls} aria-label={`${title} result`}>
                <h2>{title}</h2>
                <p className="mpw-scores">
                  MODEL_A {s.scoreA} / MODEL_B {s.scoreB}
                </p>
                <p className="mpw-scores">
                  delta {s.delta} · CI [{s.ciLow}, {s.ciHigh}]
                </p>
                <p className="mpw-conclusion">
                  {s.conclusion === "MODEL_A" ? "■ " : "□ "}<strong>{s.conclusion}</strong> · coverage {s.coverage}
                </p>
              </section>
            ))}
          </div>
          <section className="mpw-card" aria-label="Protocol differences">
            <h2 className="mpw-sec">protocol differences</h2>
            <ul>
              {(inv.differences ?? []).map((d) => (
                <li key={d}>
                  {DIM_LABEL[d] ?? d}: {String((inv.dispute?.labA as Record<string, unknown>)[d])} ↔{" "}
                  {String((inv.dispute?.labB as Record<string, unknown>)[d])}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section id="investigation" aria-label="Investigation controls">
        <h2 className="mpw-sec">controlled test</h2>
        <div role="group" aria-label="Dimensions to adopt from Lab B">
          {(inv.dispute?.exposedDimensions ?? []).map((dim) => (
            <label key={dim} style={{ marginRight: "1rem" }}>
              <input type="checkbox" checked={checked.includes(dim)} onChange={() => toggle(dim)} /> {dim}
            </label>
          ))}
        </div>
        <p>
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
        </p>
      </section>

      {exp !== null && (
        <section className="mpw-card mpw-flash" aria-label="Current controlled test" aria-live="polite">
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
          <p className="mpw-scores">
            MODEL_A {exp.accA} / MODEL_B {exp.accB} · delta {exp.mean} · CI [{exp.ciLow}, {exp.ciHigh}] ·{" "}
            <strong>{exp.conclusion}</strong> · coverage {exp.coverage}
          </p>
          <p className={exp.reproducesTarget ? "mpw-verdict-yes" : "mpw-verdict-no"}>
            {exp.reproducesTarget ? "● " : "◐ "}
            {experimentVerdict(exp)}
          </p>
          {insight !== null && <p className="mpw-muted">{insight}</p>}
        </section>
      )}

      {inv.evidenceView !== null && (
        <section className="mpw-card" aria-label="Evidence diagnostics">
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
        <section className="mpw-card mpw-flash" aria-label="Verification" aria-live="polite">
          <h3>verification</h3>
          <div className="mpw-subsets" aria-hidden="true">
            {Array.from({ length: inv.verification.totalSubsets }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <p>{subsetsLine({ subsetsTotal: inv.verification.totalSubsets })}</p>
          <p>
            status <strong>{inv.verification.status}</strong> · minimum cardinality{" "}
            {String(inv.verification.minimumCardinality)} · witness(es){" "}
            {inv.verification.coMinimumWitnesses.map((w) => w.join("+") || "∅").join(", ")}
          </p>
          <p>
            requested by <SourceTag source={verifyAsk ?? "HUMAN"} /> · exhaustively verified by{" "}
            <SourceTag source="SYSTEM" />
          </p>
        </section>
      )}

      {inv.certificate !== null && (
        <section className="mpw-cert mpw-flash" aria-label="Certificate">
          <h3>certificate</h3>
          <p>
            id <strong>{inv.certificate.certificateId}</strong>
          </p>
          <p className="mpw-scores mpw-hash">content hash {inv.certificate.certificateHash}</p>
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
          {certMsg !== null && <p role="status">{certMsg}</p>}
        </section>
      )}

      <section aria-label="Experiment trace">
        <h2 className="mpw-sec">investigation trace</h2>
        <ul className="mpw-trace">
          {inv.experiments.map((e) => (
            <li key={e.experimentId}>
              {e.subset.join("+") || "baseline"} → <strong>{e.conclusion}</strong>
              {e.experimentId === exp?.experimentId ? " (selected)" : ""}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Activity">
        <h2 className="mpw-sec">activity</h2>
        <ul className="mpw-trace">
          {inv.activity.map((e) => (
            <li key={e.seq}>
              #{e.seq} <SourceTag source={e.source} /> {e.op} — {e.detail}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
