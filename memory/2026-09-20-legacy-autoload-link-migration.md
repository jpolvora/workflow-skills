### [2026-09-20] Migrate legacy rendered autoload forms on update; exclude fix-pr scratch from link gates

- **Layer**: `Domain`
- **Module**: `managed-hub-links`
- **Severity**: `High`
- **PathPattern**: `bin/cli.js, .agents/skills/ws-configure-project/scripts/configure_autoload.cjs, .agents/skills/ws-check-harness/scripts/check_harness_links.cjs`
- **Scenario / Context**: After the managed runtime moved to the skills install, the renderers normalized only bare filenames, `../.agents/skills/...`, and `../../ws-*` forms. Existing consumer `.ws/autoload.md` files from the pre-0.4.46 renderer kept dead `](runtime/tools.md)` and `](../ws-<id>/SKILL.md)` links forever (update refresh is preserve-on-change), so agents followed non-existent paths (PR #376 round-2 review threads, score 8/10 each). Separately, gitignored `.agents/skills/ws-fix-pr/runs/**` gate prose tripped `check_harness_links` twice with link-like text such as `](runtime/<file>)`.
- **DO NOT**: normalize only the newest rendered form when migrating generated markdown; assume `update` rewrites already-prefixed links; let gitignored fix-pr scratch participate in harness link scanning.
- **INSTEAD DO**: in every hub-autoload renderer, normalize all previously rendered target forms to the current resolution: legacy `](runtime/<file>)` -> managed prefix; `](../ws-<id>/...)` -> per-skill resolved link; and `]({globalSkillsRoot}/ws-shared/runtime/...)` / `]({globalSkillsRoot}/ws-<id>/...)` tokens -> project-relative when the local skills install exists (local-first precedence). Keep every conversion idempotent, add regressions that seed legacy and token forms then run `update`/`--write-autoload` and assert migration, and exclude `ws-fix-pr/runs/**` from `check_harness_links` EXCLUDED_MD.
