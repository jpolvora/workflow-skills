# Plan — 0066 ws-shared hub / agents separation

Spec: `.agents/specs/0066-ws-shared-hub-agents-separation.spec.md` (AC1–AC12).
Branch: `feature/0066-ws-shared-hub-agents-separation` (from main c8732a20).

## Findings (pre-change)

- Managed consumer hub SoT: `.agents/skills/ws-shared/runtime/AGENTS.md` (15,755 B — over the 14,000 B cap AC9 requires).
- `.agents/skills/ws-shared/runtime/CATALOG.md` (24,414 B) carries upstream-only `### Upstream developer workflow` + `#### Before ship PR` tables (AC4 violation); line 269 is the only `.agents/skills/ws-shared` hit in that file (test-shared-hub-paths allowlist entry depends on it).
- `runtime/AGENTS.md` upstream leakage: line 15 "Upstream skill SoT … (see root AGENTS.md …)", line 66 dogfood note, `### Upstream Maintainers` pointer block (166–168, already a one-line pointer — keep that shape).
- `runtime/AGENTS.md` § External dependencies points at `CATALOG.md` § External dependencies, which does not exist (broken link).
- `setup.md` / `autoload.md`: no inline upstream contract; setup links root only for upstream context. AC5 near-satisfied; verify only.
- `ws-show-harness` / `ws-spec-format` already name the correct hub per mode. AC10 ≈ verify only.
- `HUB_WHITELIST` derives from `hub-layout.json` (runtime + templates). AC11 = no change; installer tests cover.
- No denylist enforcement exists in `ws-check-harness` (AC7) and no size assertion on the SoT hub in `test-context-budget.js` (AC9).

## Changes

1. `runtime/AGENTS.md` (AC1/AC2/AC3/AC9)
   - New explicit consumer-identity banner at top (AC1): names this file the installed consumer hub, distinguishes repo-root `AGENTS.md`, one-line pointer for upstream authoring.
   - Reword line 15 hybrid note and line 66 dogfood sentence to consumer-portable pointers without upstream-instruction phrases.
   - Keep `Upstream Maintainers` as a one-line pointer (already is); reword heading so it carries no instruction body.
   - Retain all consumer-portable obligations verbatim in structure (AC3).
   - Net result ≤ 14,000 B (cut ~2,000 B via tighter banner/quotes + pointer compression).
2. `runtime/CATALOG.md` (AC4)
   - Delete upstream-only `### Upstream developer workflow` … `#### Before ship PR` block; replace with one-line pointer to root `CATALOG.md`.
   - Add consumer `## External dependencies` mirror (config `rules.*` + artifact paths first-match table) so `runtime/AGENTS.md` § External dependencies resolves.
   - Keep consumer task router, layer inventory, scope note.
3. Root `AGENTS.md` § Doc roles (AC6): add "do not confuse" row contrasting root vs `{sharedDir}/AGENTS.md` + which hub loads in upstream vs consumer mode.
4. `ws-check-harness` (AC7/AC8): new `scripts/check_hub_separation.cjs`
   - Upstream mode: `critical` on denylisted upstream-only phrases in `runtime/AGENTS.md` (instructional bodies: session-contract prose, tie-break rules, integrity/site-bump commands, maintainer checklist bodies — not one-line pointers).
   - Drift: `critical` when `runtime/AGENTS.md` reintroduces upstream authoring sections duplicated in root; intentional differences (on-demand defaults vs dogfood autoload) pass.
   - Consumer mode: no root `AGENTS.md` required (pass-through).
   - Wire into `SKILL.md` Step 1 + Definition of Done, `PHASES.md` Phase 5a gates, `test-harness-clean.js` gate list.
5. Tests (AC9/AC12): extend `test/test-context-budget.js` with SoT hub ≤ 14,000 B assertion; new `test/test-hub-separation.js` (denylist pass/fail fixtures, drift, consumer-only resolution); wire into `package.json` `tests:harness-efficiency`; fix `test/test-shared-hub-paths.js` allowlist (drop stale runtime/CATALOG.md entry, add new-file entries as needed).
6. `setup.md` / `autoload.md` (AC5): verify-only; no edits expected. Regenerate check: installer renders `.ws/autoload.md` from SoT (no SoT link-shape change planned).
7. Ship protocol: `npm run build-site:bump` (0.4.42 → 0.4.43), `npm run generate-integrity` + `verify-integrity`, full `npm run test`, `ws-check-harness` + `test-harness-clean.js` green.

## Verification

- `rg` denylist probes per spec Validation Notes (expect zero matches in consumer hub).
- Byte sizes of both hub files.
- `npm run test` exit 0; `node test/test-harness-clean.js` 0 findings.
- AC12: fixture consumer-only tree resolves harness to `{sharedDir}/AGENTS.md` only (covered in new test).
