---
name: 05-verify-plan
description: Compares criteria/plan against current code. Two modes: (1) Quick Score — evaluates overall implementation with a 0-10 grade; (2) US Verification — from spec.md or issue number, generates a feature-by-feature table in `.cursor/plans/{slug}.plan.report.md`.
version: 2.0
disable-model-invocation: true
---

# Verify implementation vs plan / US

This skill **does not implement code** and **does not modify the original plan** (`*.plan.md` used as reference). Operates in two modes:

- **Quick Score mode** — without spec or US: evaluates overall implementation quality against the most recent plan, assigns a 0-10 score, recommends approve or reimplement. Useful at the end of any implementation task.
- **US Verification mode** — with spec.md or issue number: audits adherence between (A) specification (`*.spec.md` — canonical source), (B) GitHub issue when the spec references `id`, (C) local Markdown plan under `.cursor/plans/` and (D) code in current state; generates a feature-by-feature table at `.cursor/plans/{slug}.plan.report.md`.

Use when the user asks to **check whether implementation matches the plan**, **evaluate delivery quality**, **generate US/spec adherence report**, or invokes with US number / `*.spec.md` (e.g.: `verify-plan 1474`, `verify-plan relatorios.spec.md`).

---

## Quick Score mode (without US/spec)

When there is **no** `*.spec.md` nor US number provided, run this lightweight flow:

### 1) Locate plan + changes

- Find the most recent implementation plan under `.cursor/plans/` (by modification date or `git log`).
- Run `git status` and `git diff` to see all changed files.

### 2) Evaluate core criteria

| Criterion | Weight | What to check |
|----------|------|-----------------|
| **Completeness** | 40% | Were all files/deliverables foreseen in the plan implemented? Are there unfinished items? |
| **Correctness & Style** | 35% | Does the code follow the project patterns (layers, tenancy, conventions)? Are there obvious bugs? |
| **Tests** | 25% | Were tests added/updated? Do they run without failures? (use commands from `config.json.verification` or equivalents) |

Each criterion receives a 0-10 score. The final score = weighted average rounded to integer.

### 3) Recommendation

- **Score < 7 → REIMPLEMENT**: Identify problem areas. Suggest redesigning the plan or switching models.
- **Score >= 7 → APPROVE**: Proceed to code-review and commit.

### 4) Report (chat)

Output format — display in chat and suggest commit command:

```markdown
# Plan Implementation Audit — [plan name]

**Score: [0-10]/10**

| Criterion | Score | Notes |
|----------|------|-------|
| Completeness | | |
| Correctness & Style | | |
| Tests | | |

**Recommendation:** APPROVE / REIMPLEMENT

**Details:** [specific observations]

**Suggested command:**
`git add . && git commit -m "feat: [description]"`
```

---

## US Verification mode (with spec/issue) — Full workflow

## Input

Accepts **one** of the following (in priority order):

| Input | Example | Behavior |
|---------|---------|---------------|
| **`*.spec.md`** | `relatorios.spec.md` | Reads ACs/description from spec; `slug` from frontmatter or basename |
| **US number** | `1474` | Searches `.cursor/plans/us-1474/us-1474.spec.md`; if absent, fetches the issue from GitHub (`gh issue view`) and/or uses local plan |
| **Via workflow** | dispatch Step 6 | Uses `specPath` from `state.md` → `## Artifacts.specSnapshot` |

## Output file (mandatory)

- **Default path (flat convention):** `.cursor/plans/step-06-us-{XXXX}.plan.report.md`
- **Alternative path (per-US folder convention):** `.cursor/plans/us-{XXXX}/step-06-us-{XXXX}.plan.report.md` — used when the chosen reference plan is under this convention (see **§2) Locate local Markdown plan → Conditional output path**).
- **`{XXXX}`** = numeric issue id (e.g.: US `1474` → `step-06-us-1474.plan.report.md`).
- **Double hyphen** (`--`) before `plan.report.md` is intentional, to distinguish from `step-01-us-1474.plan.md` and other `*.plan.md` files.
- **Do not** create `step-01-us-{XXXX}.plan.md` as a substitute for the plan; the only artifact written by this skill is the **`step-06-*.plan.report.md`**.
- If the report already exists for this US, **replace it** with a new version (same name), dated in the document body.

## Prerequisites

1. **Spec or US number** — at least one must be provided (see **Input**). If none, **stop and ask**.
2. Authenticated GitHub CLI (`gh`) (optional — only needed if spec is absent and must fetch the issue):
   - `gh auth status` must indicate a valid session against remote `origin`.
   - Minimum scope: read issues.

If `gh` is not authenticated or the issue does not exist, run the audit **only against the local spec + local plan + code** and record in the report that the GitHub source was not consulted.

---

## Execution flow (mandatory order)

### 1) Load specification (`*.spec.md` — priority)

- Resolve `specPath` per **Input**.
- Read frontmatter (`id`, `slug`, `title`, `source`) and sections **Description**, **Acceptance Criteria**, **Child tasks** (format: skill [`spec-format`](../spec-format/SKILL.md)).
- Derive `{slug}` and `{XXXX}` (`id` from issue when present in frontmatter).

**If spec is absent and only US number exists:** fetch the issue from GitHub (§1b below) or use the snapshot `us-{id}.issue.json` + `github-issue-to-spec.py` if it exists in the workflow.

### 1b) Fetch the issue from GitHub (optional / fallback)

Only when the local spec does not exist or is incomplete (without ACs) and there is an issue `id`:

- Use the GitHub CLI to fetch the issue (detail + useful comments):

  `gh issue view {id} --repo <owner>/<repo> --json number,title,state,body,labels,comments`

- Mental persistence / working file: extract at least:
  - `title`, `state` (confirm the issue describes the expected feature)
  - `body` (Markdown → text) — description + embedded acceptance criteria
  - `labels` and `comments` optional, when they bring additional ACs.

**Practical implementation:** `gh issue view` (`--json` output) authenticated against remote `origin`; optionally materialize `us-{id}.issue.json` (audit-only) and derive the spec via [`github-issue-to-spec.py`](../us-workflow/scripts/github-issue-to-spec.py).

If the issue does not exist or is not accessible, document the error and proceed only with local plan + code **without** asserting adherence to the official GitHub text.

### 2) Locate the local Markdown plan

Search under **two path conventions** (both valid — the repository uses both):

1. **Per-US folder** (`write-plan`/`us-workflow` convention): `.cursor/plans/us-{XXXX}/step-01-us-{XXXX}.plan.md` — check this exact path first.
2. **Native Cursor plan file** ("flat" convention, used by plans created outside the `write-plan` flow, e.g. via `CreatePlan`): `.cursor/plans/*step-01-*{XXXX}*.plan.md` directly in the root of `.cursor/plans/` — e.g. `step-01-us1474_*.plan.md`, `step-01-us_1474_*.plan.md`, `*step-01-*{XXXX}*.plan.md`.

Use `Glob` / `Grep` in the workspace with the US numeric pattern in **both** locations before deciding.

**Rules (reference plan = read-only):**

- **0 files (in neither convention):** do not create `*.plan.md`. In the report, declare that no local plan was found and base the analysis on the GitHub issue ACs/description + code.
- **1 file:** use it only as **input** (read); record the path in the report under **Reference plan**.
- **>1 file (including combining both conventions):** pick the most recent by modification date **or** the one whose title/overview best aligns with the US title; list the others in the report as unchosen candidates. None of them shall be edited.

**Conditional output path (follows the chosen plan's convention):** if the chosen reference plan is under the **per-US folder** convention (item 1 above), write the report to `.cursor/plans/us-{XXXX}/us-{XXXX}.plan.report.md` (same folder as the plan) instead of the default flat path; if under the **flat** convention (item 2) or no plan is found, use the default flat path `.cursor/plans/us-{XXXX}.plan.report.md` (unchanged).

### 3) Read the plan and extract verifiable items

From the local Markdown, extract:

- Items from YAML `todos:` (`id`, `content`, `status`) if they exist.
- Numbered steps, ACs, “Criterion | Status” tables, `[ ]` checklists, and cited file paths.

Assemble a **canonical checklist** (one line per verification) prioritizing:

1. Acceptance criteria from the **`*.spec.md`** (canonical source).
2. Acceptance criteria from the GitHub issue (if consulted as fallback).
3. Explicit items from the local plan (steps / ACs / todos).

Group related verifications into nameable **features** (one row per feature in the final summary table). A *feature* is a testable behavior or deliverable (e.g.: “CRUD Chart of Accounts”, “Idempotent spreadsheet seed”, “Filter by status in listing”), not an isolated file.

### 4) Verify code and configuration in current state

For each verification, use objective evidence:

- `Grep` / `Read` at paths mentioned in the plan or inferred (e.g.: services/controllers in backend layers, components in the frontend source dir).
- Confirm existence of cited tests, RBAC permissions (surfaced in `auth/me`), routes and API integration in the frontend.
- If the plan called for API consumption in the frontend, confirm calls in the source dir (via project hooks/auth context, without unnecessary new libs).

Classify each verification internally (OK / Partial / missing); then **map to the Situation column in the summary table** (step 5):

| Internal classification | Use in summary table |
|-----------------------|----------------------|
| Delivery matches plan/AC | **Implemented** |
| Absent or just a sketch | **Not implemented** |
| Delivery exists but diverges (different flow, different endpoint, different UX, partial scope without equivalence) | **Implemented differently** — mandatory to explain *how* it differs in the Detail column |

Also identify **additional features**: relevant behaviors or surfaces **present in code** that are **not** in the GitHub issue ACs nor in the local plan (extra scope, undocumented refinement, absorbed technical task). List them in the mandatory “Additional features beyond original plan” section.

### 5) Mandatory final report (chat + file `us-{XXXX}.plan.report.md`)

At the **end** of execution, the main result must be **a table** (Markdown) with **each feature** from the planned scope/ACs, in the following fixed format:

| Feature (short name) | Situation | Detail / evidence |
|----------------------|----------|---------------------|
| … | **Implemented** \| **Not implemented** \| **Implemented differently** | For *Implemented*: key files or symbols. For *Not*: what's missing. For *Different*: plan asked for X, code did Y. |

**Optional "Quality" column (only when explicitly requested by the invoker, e.g. `us-workflow` Step 6):** add a 4th **Quality** column with one of the values **Excellent** (followed design/DDD correctly, clean code) | **Acceptable** (functional but with room for minor refactor) | **Insufficient** (partial, with bugs, or violates project rule) — filled only for rows with Situation **Implemented** or **Implemented differently**. When not explicitly requested, **omit** this column (keep the default 3-column table).

**Table rules:**

- **One row per feature** (group small ACs under the same feature when they are the same deliverable).
- The **Situation** column may only use the three values above (do not use “OK/Partial” in the summary table; translate to one of the three situations; if incomplete, use **Not implemented** and detail the gap in **Detail**).
- Include plan features that were **cancelled / out of scope** as a row with Situation **Not implemented** or note “Out of scope (date)” in **Detail**, per evidence — do not delete from the report.

Next, **mandatorily**, a second table or list:

#### Additional features beyond original plan

Behaviors or **relevant** deliverables in code **not** requested by the plan nor by the issue ACs. If there are none, explicitly write: *“No additional features identified.”*

| Feature / extra behavior | Where in code (file / area) | Note |
|-------------------------------|----------------------------------|--------|
| … | … | … |

Optionally, after both tables: short bullets of **risks** (security, permissions, multi-tenant) if applicable.

**Presentation order in chat:** summary table by feature → additional features → (optional) risks — **the same content** must be written to the file in step 6.

### 6) Write report to separate file (mandatory)

Create or overwrite **exclusively** at the path determined by the **Conditional output path** (§2):

- `.cursor/plans/step-06-us-{XXXX}.plan.report.md` (flat convention), **or**
- `.cursor/plans/us-{XXXX}/step-06-us-{XXXX}.plan.report.md` (per-US folder convention)

**Prohibited:** editing, adding sections, or altering YAML of any `*.plan.md` used as reference in step 2.

**Minimum content of `step-06-*.plan.report.md`**:

1. **YAML frontmatter** (optional but recommended):

```yaml
---
us: XXXX
reportDate: YYYY-MM-DD
sourcePlans: []   # list of relative paths to the .plan.md files read, or []
githubSource: gh | none
---
```

2. **Body** — copy to the file the same block required in chat (tables + gaps), with suggested main title:

```markdown
# Implementation report — US XXXX

**Generated on:** YYYY-MM-DD
**Issue:** [#XXXX](https://github.com/{owner}/{repo}/issues/XXXX) — GitHub state: {State}
**Reference plan (read-only):** `relative/path/to/plan.plan.md` | *none found*
**GitHub source:** read via `gh` | *not consulted (reason)*

## Result by feature (plan + ACs)

(mandatory table — same as step 5)

## Additional features beyond original plan

(table or phrase *No additional features identified.*)

## Gaps and next steps

- …
```

3. **Dates:** use the current environment date (session’s “Today” field) in `reportDate` and in the body.

---

## Rules of conduct

- **Original plan immutability:** `*.plan.md` files identified as the US plan are **read-only**. Any structured output goes to `step-06-us-{XXXX}.plan.report.md`.
- **Report:** the skill closure is always the **feature-by-feature table** (three situations) + **additional features** (or explicit absence phrase), in chat **and** in the `.report.md` file; do not substitute with narrative only.
- **Accuracy:** do not mark **Implemented** without a supporting file path or symbol (class/method).
- **Scope:** do not refactor the app; read code and plans; **write** only to `.cursor/plans/step-06-us-{XXXX}.plan.report.md`.
- **Secrecy:** never copy authentication tokens (`gh auth token`) into Markdown.
- **Consistency with write-plan:** where the plan cited project guardrails (layers from `config.json.stack.backend.layers[]`, tenancy, RBAC permissions, domain rules, migrations), repeat in the evidence column if the verification pertains to that.

---

## Cross-references

- **GitHub search and authentication:** `gh` CLI (`gh issue view`); script [`github-issue-to-spec.py`](../us-workflow/scripts/github-issue-to-spec.py)
- **Expected original plan format:** [`01-write-plan`](../01-write-plan/SKILL.md)
- **Quick Score report template:** [TEMPLATE.md](TEMPLATE.md)
- **Local plan example:** `.cursor/plans/verification_us_1815_e90590cc.plan.md`

---

## Suggested triggers for the user

- “Generate the US 1474 report (`step-06-us-1474.plan.report.md`)”
- “Is US 1815 aligned with GitHub and the plan?”
- `@[verify-plan] 1474`
