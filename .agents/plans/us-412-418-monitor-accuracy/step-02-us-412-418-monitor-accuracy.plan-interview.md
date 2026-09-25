# Plan interview — us-412-418-monitor-accuracy (step-02)

Audit of step-01 plan against the spec and the tree. Verdict: APPROVED with two
amendments folded into implementation.

1. Stack/security invariants: Node-only, monitor read-only (no state writes; the
   `delete scanned.tail` cleanup stays), no secrets in findings (sanitize path
   unchanged), no new host adapters, `--until-terminal` stays out of scope. OK.
2. T2 severity choice (`info` for terminal missings): checked against AC2 (zero
   critical — satisfied), AC3 (warning/info allowed — satisfied), AC9 "quiet"
   (info is non-actionable, excluded from issue proposals — satisfied), and all
   existing critical assertions (active/status-less fixtures — unaffected). `failed`
   without terminal shape stays critical. No over-correction: AC5 live control
   covered in the new test. OK.
3. Amendment A: `stepListsPresent` must treat `stepStatus` arrays as absent (arrays
   pass `typeof === 'object'`); use a non-array object check.
4. Amendment B: resolve must keep excluding the `ws-spec-multi` sentinel key when
   delegating to the shared predicate (pass `null` for sentinel values).
5. Blast radius: one product script + its docs/evals/tests. `classifyWorkflow`,
   `expectedArtifacts`, `scanTranscriptRoots`, `resolveTranscriptSource` are consumed
   by the CLI snapshot, `ws-check-workflows`, and step-baton monitor tests — full
   suite run required, no consumer-path changes (exports stay additive).

Interview artifacts: this file + refined plan note (plan stands as refined; no
separate registry drift introduced).
