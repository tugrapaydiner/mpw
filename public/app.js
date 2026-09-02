// ui uses the same service as the tools, no separate logic
import { dispute, runCounterfactual, inspectEvidence, witness } from "../src/mpwService.js";
import { registerWebMcpTools } from "../src/mpwTools.js";

const $ = (id) => document.getElementById(id);
const show = (id, v) => { $(id).textContent = typeof v === "string" ? v : JSON.stringify(v, null, 2); };

const d = dispute();
show("dispute", d);

const dimsBox = $("dims");
for (const dim of d.exposedDimensions) {
  const lab = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.value = dim;
  lab.append(box, ` ${dim}`);
  dimsBox.append(lab);
}
const selected = () => [...dimsBox.querySelectorAll("input:checked")].map((b) => b.value);

$("run").onclick = () => show("counter", runCounterfactual(selected()));
$("ev").onclick = () => show("evidence", inspectEvidence(selected(), { limit: 5 }));
$("verify").onclick = () => show("witness", witness(selected()));

registerWebMcpTools().then((r) => {
  $("webmcp-note").textContent = r.registered.length
    ? `WebMCP: ${r.registered.length} tools registered`
    : "WebMCP not detected, ui still works";
});
