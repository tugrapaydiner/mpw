# release (OpenAI WebMCP Challenge, devpost)

rules verified 2026-09-03 vs https://webmcp.devpost.com/rules. deadline Sep 3 2026 1pm PDT, judging till Sep 21 5pm PT.

submit needs: live url (in-app browser or webmcp chrome), public repo + visible license, <3min youtube demo with audio, english everything, free till judging ends.

freeze: after submitting, touch nothing — not devpost entry, repo, live site, or video. keep building only in a fork.

pin: tag the submitted commit (`git tag -a submit-2026-09-03 -m "devpost submission" && git push origin submit-2026-09-03`) and paste the tag + commit hash on the form.

hosting: pushes to main auto-deploy dist via `.github/workflows/deploy.yml`. enable Pages (settings → pages → source: GitHub Actions) once.
