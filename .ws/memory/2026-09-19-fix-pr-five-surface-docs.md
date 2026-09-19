### [2026-09-19] New user-facing capabilities need all five doc surfaces

- **Layer:** other
- **Module:** docs / harness change protocol
- **Severity:** Medium
- **PathPattern:** README.md;FEATURES.md;AGENTS.md;docs/index.html;.agents/skills/ws-shared/runtime/AGENTS.md
- **Scenario / Context:** A new run mode was documented only in its skill body plus two runtime contracts, leaving install/usage docs and the hub router silent. The Harness change protocol mandates README, root AGENTS, hub AGENTS, FEATURES, and the site for every added capability; the gap was caught by review instead of the author.
- **DO NOT:** Ship a user-facing capability documented only in its skill body; do not treat a version-stamp site rebuild as documenting the feature (site cards are hardcoded in the builder and need an explicit card).
- **INSTEAD DO:** Add one concise entry per surface (FEATURES section + config row, README table row, root AGENTS bullet, hub contract Task router sentence, builder card + rebuild without version bump); grep all five surfaces for zero mentions before opening the PR.
