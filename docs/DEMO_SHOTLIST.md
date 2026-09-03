# demo shotlist (P42)

all shots: live app at the public URL, clean browser profile, no login.
record 1080p, system audio off, narration recorded separately in English.

1. WIDE-APP (0:00): full page, dispute cards + differences visible. hold 4s.
2. PROMPT-PASTE (0:15): agent chat beside page (or overlaid PiP), prompt
   pasted in one action, sent. hold until agent starts.
3. TOOL-READ (0:30): read_dispute call + dispute/activity update visible.
4. TOOL-RUN-PARSER (~0:55): run call, controlled-test card verdict
   “Effect detected; target conclusion not reproduced.”
5. TOOL-RUN-BUDGET (~1:15): run call, verdict “Target conclusion reproduced.”
6. TOOL-VERIFY (~1:35): verify call, “16 / 16” strip + VERIFIED + minimum 1.
7. CERTIFICATE (1:50): cert panel (id, hash, limitations), download click
   optional if instant; never show waiting spinners longer than 1s (cut).
8. ARCH-CHAIN (2:15): five-box static overlay (no animation build-up).
9. ENDCARD (2:25): live URL + repo URL on plain background, 5s.

cut list: typing, loading, scrolling hunts, DevTools, repo pages, failed
takes (rerun, never patch). audio: single voice track + silence; no music.
