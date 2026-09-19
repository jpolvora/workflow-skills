### [2026-09-08] Ship gates must isolate benchmark-generated artifacts

- **Layer**: Tests
- **Module**: ws-ship-pr / test and benchmark outputs
- **Severity**: Medium
- **PathPattern**: `benchmarks/results/**`; `benchmarks/baselines/**`; `.agents/skills/ws-shared/CHANGELOG.md`
- **Scenario / Context**: Running the package test or benchmark tooling during a ship audit can rewrite generated report timestamps, create versioned benchmark baselines, and append a changelog entry while another worker is active. Those files are outside the committed release range and may be concurrent work.
- **DO NOT**: Stage or delete benchmark outputs or consumer-owned changelog changes merely because the ship audit made the tree dirty. Do not claim a clean worktree without checking after the final audit.
- **INSTEAD DO**: Capture the initial status, preserve unrelated worker files, restore only test artifacts created by this session, and verify the committed `base...HEAD` range separately before push/PR.
