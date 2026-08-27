### [2026-08-26] Avoid redundant dual Node/Python scripts

- **Layer:** harness
- **Module:** ws-shared / skill scripts
- **Severity:** High
- **PathPattern:** **/*.{cjs,js,py};**/ws-shared/scripts/**
- **Scenario / Context:** A helper was implemented twice (Node `.cjs` + Python `.py`) “for parity,” then review demanded dual-runtime tests. Dual copies drift (config routing, parent-count bugs, CI-only failures) and violate the package Node SoT (`unique-skill-script-runtime`).
- **DO NOT:** Add a second-language mirror of an existing helper, write Node/Python parity test pairs for the same job, or invent new dual `.cjs`+`.py` scripts for one responsibility.
- **INSTEAD DO:** New scripts use **one** runtime only — prefer **Node `.cjs`** for packaged skills (canonical). Pre-existing `.py` helpers may be evolved, updated, or bug-fixed in place without adding a Node twin (and vice versa). Delete unused mirrors rather than covering them with parity tests.
