### [2026-09-24] AC-ledger scoreState persist order and artifact evidence re-link

- **Layer**: Infrastructure
- **Module**: ws-spec-to-pr (ac_ledger.cjs link/score persist)
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, .agents/plans/*/ac-ledger.json
- **Scenario / Context**: During the us-415-416 run, the new `scoreState.ledgerHash` tamper check failed its own round-trip test: `verify()` bumped `ledger.revision` AFTER computing the content hash, so the persisted hash never matched the written bytes (`link()` bumps first and matched). Separately, file evidence linked before `finish` stamps a plan artifact goes stale (stamp rewrites frontmatter bytes), and re-linking with a different range leaves the stale entry behind because link keys on path+range.
- **DO NOT**: mutate the ledger (revision bump or any field) after computing a content hash over it; link artifact file evidence before the finish that stamps it and assume it stays valid; re-link a stale entry with a different range and assume the old one is gone.
- **INSTEAD DO**: perform every ledger mutation first, then stamp `scoreState` with the hash last (revision bump before hash, mirroring `link()`); link artifact evidence after the stamping finish (or re-link post-stamp), reusing the exact original path+range key to overwrite the stale entry; re-score and re-validate afterwards.
