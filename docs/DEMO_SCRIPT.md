# demo script (P42) — target 2:20–2:40, hard cap 3:00

public YouTube, English narration, no third-party logos/music. screen is the
live app the whole time; no install, login, README, code tour, or waiting.

## 0:00–0:15 — cold open on the working app (lab cards visible)

[SAY] “Two evaluation reports tested the same synthetic models on the same
benchmark and reported opposite winners. Instead of reading the charts and
guessing, I can ask my browser agent to experimentally reconcile them.”

## 0:15–0:30 — prompt pasted (never typed)

Paste into the agent chat: “These two evaluations disagree. Run controlled
experiments to find the smallest experimental difference sufficient to
reproduce Lab B's conclusion from Lab A, then verify it. Trust neither
report.” [SAY] “One prompt. No prescribed order.”

## 0:30–1:50 — real tool calls (record what actually happens)

Expected natural path (adapt to reality — see fallback):
- read_dispute → dispute summary on screen.
- run parser hybrid → “Effect detected; target conclusion not reproduced.”
- run budget hybrid → “Target conclusion reproduced.”
- verify_witness → “16 / 16 exposed protocol subsets evaluated”, minimum 1.
[SAY, over the calls] “The agent proposes each experiment. It doesn't
calculate anything itself.”

## 1:50–2:15 — certificate + limitation

Certificate panel fills: id, hash, limitations.
[SAY] “The agent proposed the investigation. It didn't calculate the proof.
Deterministic code reran the synthetic counterfactuals, used a stratified
paired bootstrap, evaluated all sixteen protocol subsets, and generated a
content-addressed certificate.”
[SAY] “This doesn't prove a universal cause. It proves the smallest exposed
protocol change sufficient to reproduce the other report's conclusion in
this evaluation.”

## 2:15–2:30 — architecture + close

Simple on-screen chain: Human + agent → WebMCP → shared scientific app →
deterministic engine → certificate.
[SAY] “Human and agent, one live state, proof by code. Links below.”
End card: live URL, repo URL. Total ≤ 2:40.

## fallback edit plan (alternate valid agent path)

If the agent orders experiments differently, skips the parser control, or
verifies earlier: keep every real call in recorded order, cut dead air, keep
the 0:00–0:15 open and the 1:50–2:30 close identical, and re-time the middle
voiceover to describe what it actually did. Never reorder calls in edit,
never dub results it didn't produce. If it fails or stalls, that take is
unusable — rerun the session, don't fabricate.
