# Step 02 — Interview audit — unique-skill-script-runtime (autoMode)

Audited plan §6 stack checks for touched framework boundaries (Node-only package, no framework
boundary beyond `resolve_consumer_root` / `workflow_state` reuse). Findings:

1. **Dual-delete safety (T1):** sibling `.cjs` files already exist and live recipes already call
   them in this tree — confirmed via script listing. Decision: delete outright, smoke-test each
   `.cjs` entry. No fallback shim needed.
2. **`utf8_stdio`/`http_retry` shared imports:** only consumed by deleted `.py` files;
   `http_retry.cjs` already exists as the Node counterpart. Decision: inline UTF-8 default
   (Node stdio) + `require http_retry.cjs` where retry is needed; delete both `.py`.
3. **Shell adapters (T4):** `install-skills.sh` is the npx/curl entry — must stay `.sh` but lose
   Python env exports. `pre-commit.sh`/`install-hook.sh` stay as thin `exec node` entries.
   Decision: port business logic, keep entries one-line execs.
4. **Test strategy:** fixture-diff each port's stdout/exit-code against the `.py` before deletion
   where a test harness exists (provider-parity, cleanup, autoload, infer-timing); elsewhere
   `node --check` + `--help`/smoke run. Full `npm run test` at Step 7.
5. **Out-of-scope guard:** consumer app languages, MEMORY history, `.agents/hooks` + `.cursor/hooks`
   host adapters, new npm deps — all excluded per spec.

Verdict: **approve plan unchanged**. Proceed to Step 3 tasks, then Step 4 implementation.
