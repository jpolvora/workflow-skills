# Code Review — ws-doctor

**Base:** `6eaf48c8f775510aaddb1d74ac68243ac7d0de92` (working tree / uncommitted ws-doctor land)  
**Plan:** `.agents/plans/ws-doctor/step-01-ws-doctor.plan.md`  
**Spec:** `.agents/plans/ws-doctor/step-00-ws-doctor.spec.md`  
**Verify:** `.agents/plans/ws-doctor/step-05-ws-doctor.plan.report.md` (score 9)  
**Mode:** autoMode (max 3 fix rounds)

## Scope reviewed

| Area | Paths |
|------|-------|
| Skill package | `.agents/skills/ws-doctor/SKILL.md`, `scripts/doctor.js` |
| Hubs | `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md` |
| Graph | `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json` |
| Tests / catalog | `test/test-ws-doctor.js`, `package.json`, `docs/index.html` |
| Integrity | `bin/skill-integrity.json` |

## Critical

No Critical findings.

## Warning

### W1. Markdown report `asciiSafe` mangled punctuation to `?` (8/10) — FIXED round 1

**Evidence read**

- `doctor.js` `formatMarkdown` used Unicode em dash (`—`) in launcher lines; `main()` wrapped the full markdown report in `asciiSafe`, which replaced every non-ASCII byte with `?`.
- Live markdown output before fix: `...register_local_spec.py --source github` ? managed script...`; provider `_comment` arrows (`→`) also became `?`.

**Failure scenario**

Human markdown reports (default CLI mode) looked corrupted; agents/maintainers could misread findings or treat `?` as truncated errors.

**Missing protection**

No transliteration of common punctuation before the ASCII strip; JSON path was unaffected (no `asciiSafe`).

**Discards**

Not a Windows console encoding crash (Node UTF-8 stdout still prints `?` replacements). Product defect is report fidelity.

**Sibling occurrences**

- `formatMarkdown` launcher/issue lines; any config comment containing `→` / `—` dumped into markdown.

```suggestion
Map em/en dash and arrows to ASCII before stripping; use ASCII separators in formatMarkdown.
```

**Re-review:** RESOLVED. Live markdown shows ` - managed script...` and `->` in provider comments. Smoke tests still pass.

### W2. SKILL.md documented `python -m py_compile` while engine uses `ast.parse` (7/10) — FIXED round 1

**Evidence read**

- `SKILL.md` Steps launcher note claimed `python -m py_compile`.
- `doctor.js` `parseCheckScript` runs `ast.parse(open(..., encoding="utf-8").read())` explicitly to avoid `.pyc` writes (read-only preference; Step 5 already noted AC4 variance).

**Failure scenario**

Agents following the skill body would expect `py_compile` / possible bytecode side effects; contract drift vs the shipped engine and vs AC4 literal wording.

**Missing protection**

Docs not updated when implementation chose read-only `ast.parse`.

**Discards**

`ast.parse` still satisfies lightweight syntax-check intent; not a functional parse-gap. Defect is documentation fidelity.

**Sibling occurrences**

None beyond SKILL.md ↔ doctor.js pair.

```suggestion
Document Python `ast.parse` (UTF-8, no `.pyc`) in SKILL.md to match the engine.
```

**Re-review:** RESOLVED. SKILL.md now documents `ast.parse` with UTF-8 read and no `.pyc` write.

## Suggestions

### S1. Further reduce healthy-tree path-error noise (5/10) — partially addressed round 1

Full-tree diagnose still reports dozens of path errors (optional consumer files, external `senior-developer/SKILL.md` resolve hints, illustrative layout tokens in hubs). Round 1 skipped single-segment dir examples (`src/`, `web/`, `shared/`) and `repos/...` API fragments (98 → 59). Remaining noise is acceptable for v1; optional later fixtures / allowlists.

## Review evidence

- Package membership: `ws-doctor` in both Workflows skill lists; hubs catalog + task router rows present; workflows count note `40` in root `AGENTS.md`.
- Portability: no host product names in `ws-doctor/`; explicit `node` launcher documented; banner + `disable-model-invocation: true`.
- Read-only: smoke `testMissingConfigDoesNotInventValues` + marker file unchanged; no fix-apply flag.
- Hybrid: project `{sharedDir}/config.json` only; `{skillsRoot}` / `{globalSkillsRoot}` independent; `--skill` global fallback present.
- `MEMORY.md` has no `## Review Patterns` section; consulted UTF-8 / URL-as-drive / no `src/skills` traps (applied).
- Invariants: plan artifacts under `{plansDir}/ws-doctor/` only; EF/tenancy N/A; no consumer hub overwrite.
- Verification after fix round 1: `node test/test-ws-doctor.js` exit 0; `npm run generate-integrity` + `npm run verify-integrity` exit 0.

## Fable audit

**Verdict:** `VERIFIED`

| Check | Result |
|-------|--------|
| Weakened checks | Not observed (smoke assertions retained; integrity regenerated with content) |
| False completion | Not observed (warnings fixed and re-verified) |
| Scope creep | Not observed (fixes confined to doctor skill + integrity) |
| Unauthorized action | None (no commit; plan dir review artifacts only) |

## Fix rounds

| Round | Fixed | Remaining Critical/Warning |
|-------|-------|----------------------------|
| 1 | W1, W2 (+ S1 partial) | 0 / 0 |

**Learning:** `ws-doctor asciiSafe punctuation mapping` (memory entry).

**Apply fixes?** Done (autoMode round 1). Advance-ready: no open Critical/Warning.

## Step Output

```yaml
step: 6
label: Code Review
status: success
base: 6eaf48c8f775510aaddb1d74ac68243ac7d0de92
reportPath: .agents/plans/ws-doctor/step-06-ws-doctor.review.md
findings:
  critical: 0
  warning: 0
  suggestion: 1
warningIds: []
fix_rounds: 1
fable:
  required: true
  verdict: VERIFIED
verification:
  doctorSmoke: { status: pass, command: "node test/test-ws-doctor.js", exitCode: 0 }
  integrity: { status: pass, command: "npm run verify-integrity", exitCode: 0 }
```
