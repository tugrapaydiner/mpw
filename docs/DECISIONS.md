# decisions

- vanilla js first, then React+TS+Vite+Vitest per preference. same seeds, same numbers across the move.
- local sync sha256 instead of node:crypto so the cert hashes in-browser too.
- TS 5.9 not 7: linter doesn't support 7 yet.
- vite base relative so the pages subpath works.
- tunnel for manual test, pages workflow for the permanent url.
- trace grading order-agnostic: coverage counts, sequence never fails a trial.
- no hashes required before canonicalization existed; clock never in cert body.
