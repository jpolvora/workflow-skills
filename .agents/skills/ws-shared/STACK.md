# Stack Definition

Human-readable companion to `config.json`. Agents read `config.json` for machine-readable values; this doc explains structure and conventions.

> **Source of truth:** `.agents/skills/ws-shared/config.json` — project identity, stack, verification, invariants. `tools.md` — tool aliases. This `STACK.md` is the human-readable guide.

## Project Stack (from config.json)

| Area | Value |
|------|-------|
| **Stack id** | `node-skills-package` |
| **Description** | Node 22 skill package / agent harness (`workflow-skills` upstream) |
| **Backend** | Node 22 / JavaScript — `package.json` |
| **Frontend** | none |
| **Database** | none |
| **Domain** | Agent skill harness — portable SKILL.md workflows, providers, shared hub |

### Layers

| Layer | Path | Role |
|-------|------|------|
| **skills-sot** | `.agents/skills` | Published skill bodies (upstream SoT) |
| **installer-cli** | `bin` | Upstream authoring CLI, integrity, site builder |
| **tests** | `test/` | Install, integrity, and quality-gate tests |
| **Scripts** | `scripts/` | Authoring utilities |

**Dry-run / isolation:** Steps **4**, **6-fix**, and **7-fix** mutate source paths only when implementing code. Step **7** Testing is validation (read/execute checks; no feature implementation unless fix loop).

## Validation Commands (from config.json)

| Layer | Tool alias | Config key | Command |
|-------|-----------|------------|---------|
| **Backend** | `test-backend` | `verification.backendTest` | `npm run test` |
| **Backend** | `build-backend` | `verification.backendBuild` | _(empty — no app build)_ |
| **Frontend** | — | — | n/a |
| **Migrations** | — | — | n/a |

Related upstream authoring (not in verification keys): `npm run generate-integrity`, `npm run verify-integrity`, `npm run build-site:bump`.

> **Script launchers:** managed skill scripts use explicit `python` / `node` / `bash` (see [`tools.md`](tools.md) § Script launchers).

## Project Rules & Skills (from config.json)

| Area | Config key | Path |
|------|-----------|------|
| **Harness routing** | `rules.harness` | `.agents/skills/ws-shared/AGENTS.md` |
| **Engineering guardrails** | `rules.seniorDeveloper` | `.agents/skills/ws-senior-developer/SKILL.md` |
| **Karpathy guidelines** | `rules.karpathyGuidelines` | `.agents/skills/ws-karpathy-guidelines/SKILL.md` |
| **Changelog** | `rules.changelogFile` | `.agents/skills/ws-shared/CHANGELOG.md` |
| **Stack companion** | `rules.stackFile` | `.agents/skills/ws-shared/STACK.md` |

**Note:** Upstream skill SoT and `pathTokens.skillsRoot` both use `.agents/skills`. Consumer-owned hub files under `ws-shared/` remain gitignored and are not published as templates.

## Project Invariants (from config.json)

| Key | Value | Intent |
|-----|-------|--------|
| `commitPlanFilesOnlyAtStep8` | true | Plan artifacts committed at delivery (Step 8), not earlier |
| EF / tenancy sample keys | false | Not applicable to this Node package |

## Code Review Diff Scope (Step 6)

```bash
git diff main...HEAD -- \
  '.agents/skills/**' 'bin/**' 'test/**' 'scripts/**' 'docs/**' 'AGENTS.md' 'README.md' \
  ':!**/node_modules/**' \
  ':!**/dist/**'
```

## Dynamic Environment Detection

| Setting | Value |
|---------|-------|
| **Base branch** | `main` |
| **Git remote** | `origin` |
| **Working branch** | `develop` |
| **Providers** | `active=local`, `scm=github` |
| **Plans / specs** | `.agents/plans` / `specs` |
