# skill-install-checksums — Delivery Result

## Expected

SHA-256 integrity for managed skill trees keyed to `bin/skill-dependencies.json`, with:

- Upstream manifest `bin/skill-integrity.json` (per-file, per-skill, `fullPackageDigest`)
- Pre-copy source verify + post-copy consumer verify on install/update (fail closed; `--force-integrity` unsafe override)
- Local record `shared/skill-integrity-local.json` (consumer-owned, never hashed)
- `integrity` audit CLI + `--check` digest compare
- Tests Phase 0b/11, README Safety docs, check-harness stale-manifest note
- ACs 1–12 from `step-00-skill-install-checksums.spec.md`

## Done

- Extracted `bin/install-rules.js`; lib `bin/skill-integrity-lib.js`; generator `bin/generate-skill-integrity.js`; committed `bin/skill-integrity.json` (v0.0.63)
- CLI: pre/post verify, `integrity`, `--check` fullPackageDigest, uninstall local-record rewrite
- Hub ships as `hub.gitignore` (npm cannot pack `.gitignore`); skip `runs/` in copy/hash
- Review fixes: do not bless failed post-verify; remove abs-path `memory` skip hazard
- `npm run tests -- --local` PASS (Phase 11); `node bin/generate-skill-integrity.js --check` OK
- Check-implementation score **9/10**; Step 6 clean after fixes; Step 7 PASS

## Next steps

- Deferred by plan: `integrity --against-published`; post-copy auto-rollback
- Do **not** include unrelated WIP in this PR: `tools.md` Node policy, `write-a-skill` tweaks, `--score-min 4` in AGENTS/`code-review.yml`
- After merge: consumers get integrity on next `npx … update`

## References

- Spec: `specs/skill-install-checksums/step-00-skill-install-checksums.spec.md`
- Plan: `specs/skill-install-checksums/step-02-skill-install-checksums.plan.refined.md`
- Check: `specs/skill-install-checksums/step-05-skill-install-checksums.plan.report.md`
- Review: `specs/skill-install-checksums/step-06-skill-install-checksums.review.md`
- Testing: `specs/skill-install-checksums/step-07-skill-install-checksums.testing.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time (agent steps) | ~1550s (sum of step elapsedSec estimates) |
| Total tokens (estimated) | ~246000 |
| LOC baseline (src/web/tests) | N/A (Node CLI hub; no those dirs) |
| LOC delta (feature files) | ~+847 / −113 on tracked paths at Step 7 (bin/cli + tests dominant) |
| Mode | full + auto |
| Check score | 9/10 |
| Package version | 0.0.63 (no bump this US) |
