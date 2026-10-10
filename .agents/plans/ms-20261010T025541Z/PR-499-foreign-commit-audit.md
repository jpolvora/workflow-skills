## Summary

The installer CLI ran its shared-hub install phase **twice per `install`/`update` run**: once from `afterSkillCopy('ws-self-learning')` inside the skill loop and again from the post-loop `shouldEnsureHub(...)`/`hubPresent()` fallback. Each pass called the consumer-artifacts writer, which unconditionally snapshotted the live config to `config.json.bak` before rewriting the live config — so the second pass backed up the **already-upgraded** config and the pre-update snapshot was destroyed (backup byte-identical to the live config).

Two surgical changes in `bin/cli.js`:

1. **One hub install per run.** A run-scoped latch inside `ensureSharedHubInstalled` now covers every call site; the two run drivers reset it at entry. The standalone `ws-self-learning` seed path is unchanged, so a memory-only install still seeds the hub. Project and global scope both behave the same.
2. **`config.json.bak` is pre-change state.** The unconditional write is replaced by `writeConfigBackup`: a prior backup whose bytes differ from the live config is preserved (it is the only record of the pre-update state), an absent or byte-identical backup is written from the raw pre-change bytes, an unreadable backup file is never fatal, and the snapshot is still taken before the live rewrite.

## Acceptance criteria

| AC | Result |
|----|--------|
| AC1 — hub install path invoked at most once per run | ✅ |
| AC2 — `ws-self-learning` + workflow skill prints a single hub status block | ✅ |
| AC3 — changing run with no differing backup writes the pre-change bytes | ✅ |
| AC4 — `config.json.bak` differs byte-for-byte from the live config after a changing run | ✅ |
| AC5 — an existing differing backup is preserved unchanged | ✅ |
| AC6 — an unchanged-config run neither deletes nor truncates the backup | ✅ |
| AC7 — unparseable live config is backed up raw and never rewritten | ✅ |
| AC8 — consumer-owned hub files survive the hub refresh | ✅ |
| AC9 — global scope gets the same once-per-run and backup guarantees | ✅ |
| AC10 — unreadable `config.json.example` leaves the live config unmodified | ✅ |

## Verification

- Ledger verify score **10/10**, no deficiencies; stack-invariant scan on the touched files **0 issues**.
- `test/test-install.js --local`: green, including 8 new targeted assertions (once-per-run block count for a full workflow set, pre-change backup bytes, backup ≠ live, idempotent re-run preservation, invalid JSON, preserve priority when the live config is unparseable, global-scope parity, unreadable template).
- `test/test-ws-shared-layout.js`: green, including 2 new assertions (differing backup preserved across an idempotent update; backup never collapses onto the live config).
- Remaining suite entries (159) executed individually: green. The aggregate `npm run test` stops on a pre-existing Windows-host timing flake in `test/test-subagent-dispatch.js` (`child started before the kill`); that entry passes standalone and is untouched by this change.
- `test-harness-clean.js`: **0 findings**; all harness phase checks green; `test/test-powershell-config-editor.js` 12/12.
- Fresh-worker verification (Step 6b): 10/10 ACs re-derived with a red fault injection each, on a scratch worktree.
- Red baseline: the unmodified pre-fix CLI prints **2** hub status blocks for one `update`; the fixed CLI prints 1.
- Version bumped once (0.5.35 → 0.5.36) with regenerated, verified integrity; site and wiki rebuilt.

## Notes

- Code review found 0 Critical and 0 Warning findings; two optional Suggestions remain open (an `exit`-time restore for a test fixture that temporarily moves the packaged template, and a warning line when a prior backup cannot be read).
- The PR head is `develop`, so the range also carries previously merged develop work; only the us-492 commits are described above.

Closes #492

### Foreign commits in range

Commits reachable from `0a6cb30` but not produced by this batch (`3490363..0a6cb30`):

- `6e3f6544` docs(batch): run history for ms-20261008T154414Z (us-490 shipped via PR #491) (`6e3f65442e0243b691a5be8f048f0ef1961635ed`)
- `ba88954a` docs(specs): import five tracker issues into three consolidated specs (`ba88954add5bfbfb4d5a0ef88338f4d43175a906`)
- `614281c3` docs(specs): fix 0171 companion self-name and index.PRD blanks (`614281c312812df1edb83acdb0872dc2e13d0665`)
- `af5e300a` chore(spec-memo): always-on dual integration (`af5e300a694a562dbc3774cb946e2a605b1bd9ba`)
- `1110317a` chore(memory): record spec-memo bridge traps (`1110317a34fdb2db7533ccf64a2c6057ccde8844`)
- `0a74caff` chore(memory): record DSH profile patch insert-wrapper trap (`0a74caff4c39f4095aecce44d7f2e2af0792616c`)
- `83c2cbbf` chore(memory): record spec-memo MCP cwd project-binding trap (`83c2cbbfdf1ccf787ee078eedfe5403387b38244`)
7 foreign commit(s) in range
