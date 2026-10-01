---
step: 6b
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7]
title: Fresh-worker verification — ws-doctor path-error fix
startedAt: "2026-10-01T03:24:00Z"
endedAt: "2026-10-01T03:33:00Z"
---
# Fresh-worker verify — us-469

Fresh re-derivation from the spec + plan of record (prior step outputs not reused). Each AC was
re-derived and one fault was injected into the committed scanner
(`.agents/skills/ws-doctor/scripts/doctor.js`, commit `994f47ff`); the linked test file had to fail.
Textbook printed from a scratch fixture; the product tree was restored byte-for-byte after each injection
(`git diff` clean).

## AC verdicts (evidence-or-zero)

| AC | Fresh derivation | Verdict |
|----|------------------|---------|
| AC1 | `.ws/config.json`/`.ws/STACK.md` cited from a skill resolve at the project root | VERIFIED |
| AC2 | a Markdown link's backticked display text is not scanned; href `target.md` resolves | VERIFIED |
| AC3 | `2>/dev/null`, `~/x`, `{true/false}`, `path/to/feature.spec.md`, `IDE/agent` are not reported | VERIFIED |
| AC4 | `{skillsRoot}/ws-external/SKILL.md` with a `{globalSkillsRoot}` copy is resolvable | VERIFIED |
| AC5 | hub `.ws/AGENTS.md` citing `.ws/` is not expanded to `.ws/.ws` | VERIFIED |
| AC6 | `runs/pr-1/plan-gate.md` + `examples.md` are excluded from live citations | VERIFIED |
| AC7 | a citation resolving at the project root is not a path error | VERIFIED |
| NS1 | a genuinely missing `.agents/skills/ws-missing/SKILL.md` is still reported | VERIFIED |
| NS2 | a genuinely missing `{skillsRoot}/ws-missing/scripts/nope.cjs` is still reported | VERIFIED |
| NS3 | `2>/dev/null`, `~/x`, `path/to/feature.spec.md` are not reported | VERIFIED |

## Fault injections (one per AC group)

| Mutation | Removed behavior | Detected | Failing test |
|----------|------------------|----------|--------------|
| M1 | root-relative resolution + root-first fallback | yes | `hub AGENTS.md docs/catalog.md …`; `AC1/AC7 repo-root-relative .ws citations …` |
| M2 | Markdown display-text skip | yes | `AC2: backticked Markdown link display text is not scanned …` |
| M3 | prose guard + install-citation gate | yes | `AC3/NS3: 2>/dev/null`, `{true/false}`, `path/to/…` |
| M4 | `{globalSkillsRoot}` fallback | yes | `AC4: {skillsRoot} citation with a {globalSkillsRoot} copy is resolvable` |
| M5 | archived run/example exclusion | yes | `AC6: archived runs/pr-* and examples.md are excluded …` |
| M6 | any missing-path reporting | yes | `NS1`, `NS2`, both strict `docs/faq.md` link checks |

## Observed signals

- Healthy-install Path errors: **205 → 0** (`node ws-doctor/scripts/doctor.js --json`).
- Missing cited scripts: 5 → 0.
- Real broken references remain reportable (M6 confirms the reporting path is live).
- Product tree restored after every injection; `git status` on `doctor.js` clean.

No residual defects; no fix round required.
