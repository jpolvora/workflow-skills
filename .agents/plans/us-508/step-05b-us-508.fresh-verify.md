# Fresh-worker verify — us-508

Independent re-derivation of every AC verdict from the spec, the plan of record,
and the committed diff (`39cf18f8`). Fault injection on a scratch worktree
(temporary directory) — no product tree mutation.

## Evidence-or-zero

| Command | Result |
|---------|--------|
| `node test/test-check-workflows-global-root.js` | exit 0 — all us-508 + us-504 assertions pass |
| `npm run test` (configured alias `backendTest`) | exit 0 — 164/164 |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| Fault injection (pre-fix resolver `39cf18f8^` injected into a copied global tree) | RED PROVEN |

### Fault injection (red state)

Injected the pre-fix `check_workflows.cjs` body into a copied
`<home>/.agents/skills` tree and ran it from a consumer checkout:

```json
{
  "preFixHasResolvedRoot": false,
  "preFixHasResolutionSource": null,
  "preFixHasChecks": false,
  "preFixReportInInstallParent": true,
  "preFixReportInConsumer": false
}
```

The pre-fix script has no `resolvedRoot`/`resolutionSource`/`checks`, and it
wrote `ws-check-workflows-report.md` into the install parent (`<home>`) instead
of the consumer checkout — so every us-508 assertion fails against it. The fixed
commit passes all of them.

## AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | VERIFIED | `--json` exposes `resolvedRoot` + `resolutionSource` (vocabulary asserted). |
| AC2 | VERIFIED | Consumer fixtures (`package.json`, `.git`) resolve to the checkout. |
| AC3 | VERIFIED | No-marker cwd resolves to `<home>/.agents`. |
| AC4 | VERIFIED | `resolvedRoot !== <home>` asserted. |
| AC5 | VERIFIED | Skip record names the missing manifest path. |
| AC6 | VERIFIED | Skip + reason in `--json checks` and the Markdown report. |
| AC7 | VERIFIED | Package-root fixture with a missing manifest → CRITICAL, exit 1. |
| AC8 | VERIFIED | `cwd-fallback` emits the degraded-resolution WARNING naming the root. |
| AC9 | VERIFIED | `--report` inside the resolved root, absent from the install parent. |
| AC10 | VERIFIED | Regression asserts `resolvedRoot` + `resolutionSource`. |
| AC11 | VERIFIED | Fixture has no `.git` in the install tree, still resolves correctly. |
| AC12 | VERIFIED | Global-only fixture asserts the skip record naming the manifest. |
| AC13 | VERIFIED | Consumer-cwd fixture asserts root == checkout, no install-parent write. |
| NS1–NS10 | VERIFIED | All negative scenarios exercised (red-first where applicable). |

## Result

All ACs VERIFIED; fault injection proves the tests are not vacuous. No defects
to fix.
