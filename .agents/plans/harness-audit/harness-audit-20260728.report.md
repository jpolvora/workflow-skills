## Harness Audit

**Date:** 2026-07-28
**Mode:** dry-run (scan + plan only; Phase 7 not authorized)
**Scope:** full (Phases 0–5c) — extra focus: PR #164 / `ws-classify-complexity` v0.0.104 (routing, deps, hubs, ARTIFACTS, portability)
**Files inspected:** ~60 (37 `SKILL.md`, 3 hubs, orch/dispatch/ARTIFACTS, ship-pr PREPARE, classify script, `bin/skill-dependencies.json`, integrity, sample companion docs)
**Path token map:** `{skillsRoot}=.agents/skills` `{sharedDir}=.agents/skills/ws-shared` `{plansDir}=.agents/plans` `{reviewsDir}=.agents/codereviews` (from `{sharedDir}/config.json`)
**Status:** awaiting approval to apply corrections

### Executive summary
- Problems found: 4 (0 critical, 3 warning, 1 suggestion)
- Broken links: 0 in hubs / orch / classify / ship-pr; 1 illustrative secondary link in `ws-check-harness/PHASES.md` (`[faq](docs/faq.md)` example)
- Absolute paths: 0 in audited skill bodies
- Path-token notes: healthy tokens expanded; token-in-link-target: 0; undeclared `ws-shared/MEMORY.md` shorthand: 0 (prose `ws-shared/config.json` citations treated healthy per PHASES)
- Redundancies/conflicts: multi-spec Smart Flow duplicates classify thresholds (warning); dual-hub classify routing aligned
- Unrouted skills/rules: 0 vs root / packaged hubs; ws-shared orch-only pipeline/providers intentionally omitted
- Auto-load: 3 mandatory upstream dogfood (~259 lines) + 2 conditional completion (~137 lines); AGENTS.md root ~418 lines
- Detected overlaps: complementary / composed domains healthy; 1 uncomposed_slop (multi-spec vs classify)
- Simulation alerts: opt-out inconsistency for `ws-senior-developer`; no circular loads
- Integrity: `npm run verify-integrity` exit 0 (v0.0.104); `packageVersion` aligned; pipeline §3b + retired-id scan clean (PHASES contract mentions only)
- Classify focus: on disk, in workflows package (35), in `ws-spec-to-pr` / lite deps + multi-spec transitive closure, routed in root / packaged / ws-shared, ARTIFACTS registers `step-00-{slug}.classify.md`, portable (no IDE brands / project hardcoding in skill or `classify.cjs`)

### Correction plan (ordered — apply only after approval)

| # | Severity | File | Problem (error) | Proposed correction |
|---|------------|---------|-----------------|-------------------|
| 1 | warning | `ws-senior-developer/SKILL.md` + root / `.agents/AGENTS.md` § Opt-out | Hubs cite `stop ws-senior-developer` in Precedence; ws-shared Opt-out table lists it; skill body has no Opt-out section; root/packaged Opt-out tables omit the phrase | Add Opt-out section to `ws-senior-developer/SKILL.md` mirroring hub phrase; add row to root + packaged Opt-out tables |
| 2 | warning | `ws-multi-spec/PROTOCOL.md` (+ optional deps) | Smart Flow hardcodes `≤ 3` / `≤ 6` / `≤ 2` instead of composing `ws-classify-complexity` / live `dagThresholds` — drift if config changes | Delegate threshold scan to `ws-classify-complexity` (or read `dagThresholds` from config); update PROTOCOL; consider direct dep |
| 3 | warning | `ws-spec-index/REFERENCE.md:73` | Host product name `Cursor` in skill companion (“Cursor session `stop`”) — harness-neutrality | Rephrase to host-neutral wording (e.g. “IDE/agent session stop / after-agent hooks”) |
| 4 | suggestion | `ws-check-harness/PHASES.md` | Illustrative Markdown link `[faq](docs/faq.md)` resolves to missing `.agents/skills/ws-check-harness/docs/faq.md` | Use backtick-only example (no live link) or point at a real LEGACY FAQ path |

#### Details per item

**#1 — Opt-out consistency (`ws-senior-developer`)**
- **Error:** Phase 5c / MEMORY trap pattern: auto-load skills must recognize hub Opt-out phrases. Evidence: root `AGENTS.md` Precedence L226 and packaged `.agents/AGENTS.md` L102 cite `stop ws-senior-developer`; `{sharedDir}/AGENTS.md` Opt-out table includes the phrase; `ws-senior-developer/SKILL.md` has no Opt-out / `stop ws-senior-developer` text; root/packaged Opt-out tables (L229–236 / L105–111) only list `ws-tdah` phrases.
- **Correction:** (a) Add `## Opt-out` to `ws-senior-developer/SKILL.md` with `| stop ws-senior-developer | Disable for this session |` (and note config `rules.seniorDeveloper` unset). (b) Add the same phrase row to root + packaged `AGENTS.md` § Opt-out tables so Precedence, tables, and skill agree.

**#2 — `ws-multi-spec` vs `ws-classify-complexity`**
- **Error:** `PROTOCOL.md` Phase 3 Smart Flow (“If implementation tasks ≤ 3 AND estimated files ≤ 6 AND layers ≤ 2 (matching `config.json.dagThresholds` limits)”) hardcodes default numeric limits. `ws-classify-complexity` is the canonical classifier (script + gate) and is already a transitive dep via orch, but multi-spec does not invoke it; skill Related note says multi-spec “may call this skill later.”
- **Correction:** Replace hardcoded comparison with invoke of `ws-classify-complexity` (or shared read of `{sharedDir}/config.json` → `dagThresholds`). Optionally add `ws-classify-complexity` to `dependencies["ws-multi-spec"]` in `bin/skill-dependencies.json` + packaged `ws-shared/skill-dependencies.json`, regenerate integrity if graph changes.

**#3 — Harness neutrality**
- **Error:** `.agents/skills/ws-spec-index/REFERENCE.md` L73: `- Cursor session stop / after-agent hooks` names a host product.
- **Correction:** Replace with host-neutral phrasing without product brands.

**#4 — PHASES example link**
- **Error:** After stripping fences, `[faq](docs/faq.md)` in PHASES bare-relative-link guidance is a real href → missing file under `ws-check-harness/`.
- **Correction:** Change to backtick `docs/faq.md` only (keep as documentation of resolution rules).

### Skills and rules not routed in the resolved hub
| Type | Id / file | Path | Plan suggestion (#) |
|------|--------------|------|------------------------|
| — | (none vs root / packaged) | — | — |

**Intentionally omitted (ws-shared hub):** pipeline `ws-write-plan`…`ws-fix-pr`, providers — hub § Intentionally orch-only. Not correction-plan items.

### Routing and decision
- [x] Optional host entry → AGENTS.md — absent (OK; upstream uses root hub)
- [x] Progressive disclosure (AGENTS.md does not duplicate bodies) — OK
- [x] Skill → skill relationships — OK (gap: multi-spec → classify, plan #2)
- [x] Invocation triggers — OK (`disable-model-invocation` on orch/pipeline agents as expected; classify is model-invokable utility)
- [x] Skills/rules on disk vs resolved hub — OK (root/packaged: 0 unrouted / 0 phantom; 37 SKILL.md; name collisions: none; folder==name: all)
- [x] Orchestrator dependency closure vs `bin/skill-dependencies.json` — OK (`ws-classify-complexity` in `ws-spec-to-pr`, `ws-spec-to-pr-lite`; transitive via multi-spec)
- [x] `ws-spec-to-pr` dependency portability — OK for classify (config `dagThresholds`, path tokens, no project hardcoding)
- [x] Dual-hub path parity (root ↔ packaged) — OK for skill path ids including classify
- [x] Skill integrity `--check` — OK (v0.0.104)
- [x] Pipeline §3b / retired ids — OK (live orch/hubs/deps clean)
- [x] ARTIFACTS — OK (`step-00-{slug}.classify.md` registered; not delivery-staged)

### Redundancies and conflicts
| Theme | Files | Type | Plan item (#) |
|------|----------|------|-------------------|
| Pipeline classify | `ws-classify-complexity` vs `ws-multi-spec/PROTOCOL.md` Smart Flow | uncomposed_slop (hardcoded thresholds) | #2 |
| Opt-out | hubs vs `ws-senior-developer` | inconsistent opt-out recognition | #1 |
| Complexity axes | classify `lite\|standard` vs gates.md `simple\|standard\|complex` | complementary (documented orthogonality) | — |

### Auto-load skills matrix (Phase 5c.1)
| Skill | Mandatory? | Lines | Output directives | Interacts with |
|-------|-------------|--------|---------------------|-------------|
| `ws-senior-developer` | Yes (upstream dogfood) | 103 | Delivery gate, user-gate on ambiguity, pre-ship proof | karpathy, tdah, MEMORY |
| `ws-karpathy-guidelines` | Yes | 83 | Surgical diffs, no scope creep, surface assumptions | senior-developer, MEMORY |
| `ws-tdah` | Yes (upstream dogfood) | 73 | Action-first compression + judgment | senior proof vs compression |
| `ws-self-learning` | Conditional (before plan/code/fix) | 80 | Consult/write MEMORY | karpathy, tdah |
| `ws-changelog` | Conditional (task completion) | 57 | Append changelog | self-learning |

**Estimated total footprint:** Mandatory ~259 lines (~30%), Conditional ~137 lines (~16%), root AGENTS.md ~418 lines (~48%), **Total baseline ~814 lines** (skills+hub; excludes on-demand pipeline). Consumer ws-shared default omits tdah/senior autoload → lower baseline.

#### Conflict matrix between mandatory auto-load skills
| Skill A | Skill B | Interaction | Status |
|---------|---------|-----------|--------|
| senior-developer | karpathy-guidelines | Macro gate vs micro hygiene | none (complementary) |
| senior-developer | ws-tdah | Proof detail vs compression | mitigated (precedence + tdah technical accuracy) |
| karpathy-guidelines | ws-tdah | Surgical + compressed replies | none |
| All | Opt-out docs | senior stop phrase | **unresolved → warning #1** |

#### Precedence verification
- [x] AGENTS.md § Precedence ordering is consistent with autoload roles
- [ ] No auto-load skill contradicts the declared hierarchy — **gap:** senior-developer skill does not document hub opt-out phrase
- [ ] Documented opt-outs are recognized by all affected skills — **fail for `stop ws-senior-developer`** (plan #1); `ws-tdah` phrases OK

### Overlapping skills, instruction duplication & composition topology (Phase 5c.2)
| Domain | Skills | Overlap / Composition type | Role Clarity | Recommendation |
|---------|--------|----------------------------|--------------|----------------|
| Pipeline classify | `ws-classify-complexity` vs gates Complexity | complementary (documented orthogonal axes) | ✅ Sharp | Keep separation |
| Batch classify | `ws-multi-spec` vs `ws-classify-complexity` | uncomposed_slop | ✅ roles clear; composition incomplete | Plan #2 |
| Implementation | `ws-senior-developer` vs `ws-karpathy-guidelines` | complementary | ✅ Sharp | Keep |
| PR workflow | `ws-fix-pr` vs `ws-goal-fix-pr` | composed | ✅ Sharp | Keep |
| Orch | `ws-spec-to-pr` / lite → pipeline skills | composed | ✅ Sharp | Keep; classify wired Step 0 |

### Simulated context load (Phase 5c.3)

#### Loading tree (session start)
```
AGENTS.md (root, upstream)
    ├── ws-senior-developer/SKILL.md (auto dogfood)
    ├── ws-tdah/SKILL.md (auto dogfood)
    ├── ws-karpathy-guidelines/SKILL.md (auto)
    ├── {sharedDir}/MEMORY.md (before plan/code/fix)
    └── on completion: ws-changelog + ws-self-learning write path
```

#### Session scenarios
| Scenario | Extra skills | Estimated footprint |
|---------|---------------|--------------------|
| Session start (baseline) | — | ~814 lines |
| Spec→PR classify Step 0 | + `ws-classify-complexity` (~122) | ~936 lines |
| Full standard orch worst case | + pipeline/providers on demand | progressive (not all at once) |

#### Simulation alerts
- [x] Circular load: none detected
- [x] Deep chain (>4 levels): none material
- [x] Orphan triggers: none for classify (task router + orch Step 0)
- [x] Redundant reload: none material
- [ ] Inconsistent opt-outs: **`stop ws-senior-developer`** (plan #1)
- [x] Rules conflicting with auto-load: none

### Skill improvements (optional — ws-write-a-skill installed)
*(Upstream debt — informational; managed skills; severity suggestion unless noted in plan)*

| Skill | Finding | Severity | Proposed correction | Plan item (#) |
|-------|--------|------------|-------------------|-------------------|
| `ws-multi-spec` | Hardcoded threshold sediment vs classifier primitive | warning (promoted to plan) | Compose `ws-classify-complexity` | #2 |
| `ws-classify-complexity` | Lean SKILL (~122 lines); good progressive disclosure | — | None | — |
| `ws-senior-developer` | Missing Opt-out section (sediment/consistency) | warning | Add Opt-out | #1 |

### Next step
Awaiting your approval to apply the plan. Choose from `user-gate`:

| Option | Behavior |
|--------|----------|
| **Apply all corrections in the plan (recommended)** | Phase 7: items #1–#4 |
| **Apply only critical items** | No criticals — nothing to apply |
| **Apply selection** | Indicate plan numbers (e.g. #1 #3) |
| **Do not apply — report only** | Ends without editing |
| **Skip** | Discard plan |

Report persisted at `.agents/plans/harness-audit/harness-audit-20260728.report.md`.
