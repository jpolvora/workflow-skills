---
name: fix-pr
description: Cooperatively fix active code review threads on GitHub or Azure DevOps PRs. Thread scoring, confirmation gate, surgical fixes, validation, structured reports. Use when user asks to fix/review/resolve PR review threads. Also wrapped by goal-fix-pr for convergence loops.
version: 1.0
disable-model-invocation: true
---

# Skill: fix-pr

Cooperative PR thread resolution for **GitHub** and **Azure DevOps**. Combines platform-agnostic thread analysis, scoring, and structured reporting with platform-specific fetch/resolve scripts.

Runtime **IDE** complementar ao **Auto-Fix CI** (`--auto-fix` / `auto-fix.yml`). Both use the same cooperative gates and response format — same process, **no code coupling**.

| | Auto-Fix CI | fix-pr (IDE) |
|---|-------------|--------------|
| Trigger | `workflow_run` / `--auto-fix` | `/fix-pr` manual |
| Fix mode | Subagent JSON + replacements | Agent IDE (direct edit) |
| Threads | Bot (`PlatformProvider`) | **All** open threads (GraphQL / REST) |
| Platform | GitHub | **GitHub** or **Azure DevOps** (auto-detected) |
| Push | After resolution OK | After resolution OK |

---

## Platform detection

Detect from git remote and branch accordingly for all subsequent steps:

```bash
# GitHub
git remote get-url origin | grep -q github.com && export PLATFORM=github

# Azure DevOps
git remote get-url origin | grep -q dev.azure.com && export PLATFORM=azure
```

| Platform | Fetch threads | Resolve threads | Auth |
|----------|--------------|-----------------|------|
| **GitHub** | [`scripts/fetch_threads.cjs <PR_ID>`](scripts/fetch_threads.cjs) | [`scripts/resolve_thread.cjs <THREAD_ID>`](scripts/resolve_thread.cjs) | `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` |
| **Azure DevOps** | `scripts/fix_pr_azure_context.py collect` | `scripts/fix_pr_azure_context.py resolve-thread` | `AZURE_DEVOPS_PAT` or `.azure-devops/azure-devops.secret` |

---

## Preconditions

- Repository checked out; PR branch available.
- Platform detected (must be GitHub or Azure DevOps — see platform detection).
- Platform token configured (see table above).
- **GitHub:** `gh` CLI installed and authenticated (`gh auth status`).
- **Azure DevOps:** `.agents/skills/azure-devops/azure-devops.config.json` with `organization` and `project`.

---

## Flow (cooperative gate)

```
code review → developer fix → commit → resolve threads → push → code review → …
```

`fix-pr` lists **all** open review threads — bot, human, or any reviewer.

---

### 0. Branch sync and CI check (mandatory before editing)

Avoids fixing threads on outdated code or wrong branch.

**GitHub:**

```bash
gh pr view <PR_ID> --json headRefName,baseRefName,state
git branch --show-current
git fetch origin
git pull origin <headRefName>
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py collect --pr-id <PR_ID> --output .agents/skills/08-fix-pr/runs/pr-<PR_ID>/context.json
# Verify branch from context.json → pullRequest.sourceRefName
git pull origin <sourceRefName>
```

**Gate:** proceed only if:
- Local branch matches PR head;
- `git pull` finished without conflicts;
- `git status` shows no unexpected divergence.

If PR is **closed/merged**, inform user and do not start fixes.

**0b. Auto-Fix CI check (GitHub only, requires `gh`):**

```bash
gh pr checks <PR_ID> 2>/dev/null
gh run list --workflow=agentic-code-review.yml --status in_progress --json status,conclusion,createdAt,url 2>/dev/null
gh run list --workflow=agentic-auto-fix.yml --status in_progress --json status,conclusion,createdAt,url 2>/dev/null
```

| Situation | Action |
|-----------|--------|
| GitHub with `gh` available | Check CI status and inform user |
| Azure DevOps / `gh` unavailable | Skip CI check; proceed |
| Review or Auto-Fix `in_progress` | Inform user (URL, time); recommend waiting or confirm before editing |
| No active runs | Inform briefly and proceed |

Do not auto-block — let user decide.

---

### 1. Fetch open threads

**GitHub:**

```bash
node .agents/skills/08-fix-pr/scripts/fetch_threads.cjs <PR_ID>
# JSON for parsing:
node .agents/skills/08-fix-pr/scripts/fetch_threads.cjs <PR_ID> --json
```

Equivalent `gh` CLI alternative:
```bash
gh pr view <PR_ID> --json comments
```

Output: `threadId`, `filePath`, `lineNumber`, `summary` — all open threads.

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py collect --pr-id <PR_ID> --output .agents/skills/08-fix-pr/runs/pr-<PR_ID>/context.json
```

Output: `context.json` with `activeThreads[]` (threadId, path, rightLine, comments).

---

### 2. Thread scoring and classification

Classify each thread by urgency and materiality using the 0–10 scale:

| Score | Urgency | Meaning / Action |
|-------|---------|------------------|
| **0–2** | Low | Aesthetic nit, style, writing preference → **Resolve without code** |
| **3–5** | Low | Low material risk or unlikely inconsistency → **Resolve without code** |
| **6–8** | High | Probable bug, logic failure, or misalignment with acceptance criteria → **Fix in code** |
| **9–10** | High | Critical (security, data loss, transactional integrity) → **Fix in code** |

**Scoring criteria:**

1. Is the failure scenario executable and probable?
2. Does the finding align with the Work Item scope and approved plan?
3. Is the code already protected by other invariants, validations, or tests?
4. Is the potential impact material (security, data loss, financial/tax breaches)?
5. Is the recommended change proportional, or does it over-engineer / nitpick?

**Escalate** when: conflict between Work Item, plan, and comment; or product ambiguity requiring human decision.

---

### 3. Confirmation gate (mandatory before any edit or resolve)

Present the plan to the user and **stop** for confirmation before any code edit or `resolve-thread`.

Save plan to `.agents/skills/08-fix-pr/runs/pr-<PR_ID>/plan-gate.md` (do not commit) with sections:

- **Fix in code** (Threads with Score > 5)
- **Resolve with comment** (Threads with Score ≤ 5)
- **Escalate** (Awaiting human decision)

Table format: `Thread` | `File` | `Score` | `Urgency` | `Summary`.

Present numeric summary and ask **exactly**:

```text
Proceed with fixes for threads [ID1, ID2]?
```

- If user refuses or does not confirm, do not proceed. If cleanup requested, delete `runs/pr-<PR_ID>/` recursively (preserve `.gitignore`).
- If classification change requested, update plan file and re-ask.

---

### 3.1. Execution plan (post-gate)

After gate 3 approval:

1. Create `.agents/skills/08-fix-pr/runs/pr-<PR_ID>/plan-exec.md` with:
   - Header metadata: PR, Round, Gate Approved at, Mode, Platform, **LLM Model**.
   - Per approved thread: `ThreadId`, `Action`, `File/line`, `Strategy`, `Allowed files`, `Tests`, `Checklist`.
   - **Reportable output** section (layout for step 6).
   - Operational checklist (steps 4–6).
2. Inform path of `plan-exec.md` and ask **exactly**:

```text
Execute plan normally?
```

3. Execute steps 4–6 only if plan is explicitly approved.

---

### 4. Resolve without code (Score ≤ 5)

For threads classified as "Resolve with comment", post justification via platform script.

**GitHub:**

```bash
node .agents/skills/08-fix-pr/scripts/resolve_thread.cjs <THREAD_ID> "No code change: scenario blocked by X; Work Item/plan does not require Y; real risk low because Z."
```

Equivalent `gh` CLI alternative:
```bash
REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_ID/comments/$THREAD_ID/replies" -f body="No code change: scenario blocked by X; Work Item/plan does not require Y; real risk low because Z."
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py resolve-thread --pr-id <PR_ID> --thread-id <THREAD_ID> --model "<model-id>" --comment "No code change: scenario blocked by X; Work Item/plan does not require Y; real risk low because Z."
```

Add `--dry-run` if dry-run mode is active.

---

### 5. Fix code (Score > 5)

For each thread approved for code fix:

1. Map fix strategy against review thread and quality criteria from [`code-review/SKILL.md`](../06-code-review/SKILL.md).
2. Analyze local impacts: callers, signatures, tests, adjacent flows.
3. **Fix the defect class, not just the instance (mandatory).** Before closing, search for sibling occurrences of the same pattern or breach in changed diff files. Fix all at once to prevent review loops.
4. Create `.agents/skills/08-fix-pr/runs/pr-<PR_ID>/thread-<THREAD_ID>.state.md` with: problem, strategy, sibling occurrences found, paths analyzed, residual risks, test plan.
5. Apply **surgical fix** (see Karpathy guidelines — surgical changes, no scope creep).

---

### 6. Validate, report, resolve threads, publish

1. **Build and test:**

```bash
dotnet build                    # if backend touched
dotnet test                     # if backend touched
cd web && npm test && npm run build  # if frontend touched
```

2. **Auto-review before push (mandatory):**

Run [`code-review`](../06-code-review/SKILL.md) skill on current branch diff to verify own changes under same rigor as pipeline.
Use for **detection only** — fixes continue via fix flow. Correct new findings and repeat until **"No feedback"**.

3. **Generate report** (when code was changed):

Create `.cursor/codereviews/PR-<PR_ID>-rodada-<N>.md`:

```markdown
# Report — PR <PR_ID> Round <N>

| Field | Value |
|-------|-------|
| PR | <PR_ID> |
| Round | <N> |
| Platform | GitHub / Azure DevOps |
| LLM Model | <model-id> |
| Threads handled | <count> |
| Local tests | <results> |
| Files changed | <list> |

## Per thread

### Thread <ID> — <File> (Score: <N>)

**Problem:** ...
**Fix applied:** ...
**Sibling occurrences:** ...
**Tests:** ...
**Residual risks:** ...

## Learnings for MEMORY.md

- **ID:** <proposed-id>
- **Defect class:** ...
- **Target section:** ## Review Patterns / ## Patterns / ## Traps
```

4. **Memory/learning (recommended before push):**

If new defect class, consolidate learning in `MEMORY.md` (prefer via `us-workflow`; outside it, only with explicit user authorization).

5. **Resolve threads on platform:**

**GitHub:**

```bash
node .agents/skills/08-fix-pr/scripts/resolve_thread.cjs <THREAD_ID> "Root cause and what was fixed. See report: .cursor/codereviews/PR-<PR_ID>-rodada-<N>.md"
```

Equivalent `gh` CLI alternative:
```bash
REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_ID/comments/$THREAD_ID/replies" -f body="Root cause and what was fixed. See report: .cursor/codereviews/PR-<PR_ID>-rodada-<N>.md"
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py resolve-thread --pr-id <PR_ID> --thread-id <THREAD_ID> --model "<model-id>" --comment "Root cause and what was fixed. See report: .cursor/codereviews/PR-<PR_ID>-rodada-<N>.md"
```

**Gate:** if **any** attempted resolution fails → **do not push**. Inform user which `threadId` failed.

6. **Commit and push:**

Detect current round by counting existing reports or run directories:
```bash
ROUND=$(ls .cursor/codereviews/PR-<PR_ID>-rodada-*.md 2>/dev/null | wc -l)
ROUND=$((ROUND + 1))
```

Surgical commit (never `git add .` indiscriminately):
- Include modified files and report `.cursor/codereviews/PR-<PR_ID>-rodada-${ROUND}.md`.
- Commit message:

**GitHub:**
```
fix(#<PR_ID>): run #${ROUND} — fix issues from review threads [<THREAD_ID1>, <THREAD_ID2>]
```

**Azure DevOps:**
```
Fix PR <PR_ID>: run #${ROUND} — [<THREAD_ID1>, <THREAD_ID2>]
```

```bash
git push origin HEAD
```

Skip push in `dry-run` mode.

---

### 7. Wait for next review round

If new threads appear, restart from **step 0** (branch sync + pull) then step 1.

---

## What not to do

- Do not investigate or edit before **step 0** (branch sync + pull).
- Do not push before resolving attempted threads.
- Do not refactor code adjacent to the issue.
- Do not create `implementation_plan.md` as mandatory — mental plan or short notes suffice for simple fixes.
- Do not resolve a thread without provable change at the anchored line.

---

## Scripts

| Script / Command | Platform | Role |
|------------------|----------|------|
| [`scripts/fetch_threads.cjs`](scripts/fetch_threads.cjs) | GitHub | Fetch open review threads via GraphQL |
| [`scripts/resolve_thread.cjs`](scripts/resolve_thread.cjs) | GitHub | Reply + resolve thread via GraphQL |
| `scripts/fix_pr_azure_context.py collect` | Azure DevOps | Collect PR context + active threads via REST |
| `scripts/fix_pr_azure_context.py resolve-thread` | Azure DevOps | Reply + resolve thread via REST |

---

## Contract

All resolutions include the canonical marker:

```
<!-- resolution-reply -->
```

Body: **detailed explanation** from the agent (problem, root cause, change, why it resolves).

See [`scripts/COOPERATIVE_FIX.md`](scripts/COOPERATIVE_FIX.md) for full contract shared with Auto-Fix CI.
