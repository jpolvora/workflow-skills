# `/ws-wiki apply` (Phase 3 — findings plan plus batch apply)

Plan and updating pass. Show the findings plan, collect truth decisions, then batch-apply wiki edits and generate code-change specs.

**Aliases:** `/ws-wiki reconcile`, `/ws-wiki phase-3`

**Preconditions:** Requires a checkpoint with `status: audited` (or leftover `pending` decisions). Missing checkpoint → STOP with a message to run `/ws-wiki verify` first. `--resume` continues truth gates then apply.

1. **Findings plan:** Present every `differs` and `absent` finding with wiki path, quoted statement, code evidence (paths + short excerpt or `no match`), and two truth options (proposed wiki edit vs proposed code-change spec). Do not write wiki pages or specs until truth decisions are recorded. `confirmed` / `inconclusive` counts appear in the summary only.

2. **Truth gate per finding:** For each actionable finding present a `user-gate` (host structured choice via `askQuestion` when that tool is bound; markdown fallback otherwise):
   1. **Update wiki (Recommended)** — code (or absence of code) is the source of truth; schedule a wiki edit that drops or rewrites the statement.
   2. **Update code** — the wiki statement stays; schedule a new spec so implementation can be changed to match.
   Cancel / dismiss → HS-1 STOP; keep already-recorded decisions; do not apply the remaining un-decided batch. Undecided findings stay `pending`.

3. **Batch apply after all decisions (or after STOP of remaining):**
   - **Wiki batch:** Apply scheduled wiki edits in one pass. Edits are in-place 3-section pages with no changelog append. Writer targets reuse the `assertContained` pattern for paths under `{wikiDir}`; a path-traversal domain/feature from a malicious wiki filename is rejected and no write leaves `{wikiDir}`. Run `sync_wiki_index.cjs` after the batch if titles/one-liners changed, then `validate_wiki.cjs --check`. Product `.cjs` and skill bodies outside `{wikiDir}` are not edited for those findings.
   - **Code batch:** Do not edit product code in this skill. For each finding marked Update code, invoke standalone `ws-spec-write` (skill `ws-spec-write`, not a `{plansDir}` register) with a description that is exactly the template `Update feature {title} to reflect current wiki statement: {statement}` (`{title}` from the wiki page title or index one-liner, `{statement}` the quoted wiki text). Frontmatter `source: local`. Those specs land under `{specsDir}` only.

4. **Close:** Phase 3 does not implement those specs and does not start an orchestrator (`ws-spec-to-pr` / lite is out of band). Successful apply sets checkpoint `status` to `completed` or deletes the file.
