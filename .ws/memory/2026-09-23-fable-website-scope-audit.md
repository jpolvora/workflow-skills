### [2026-09-23] Fable scope audits must use the ship-stage file set
- **Layer**: devops
- **Module**: ws-fable-judge / ws-ship-pr
- **Severity**: Critical
- **PathPattern**: docs/**; bin/**; test/**; package.json
- **Scenario / Context**: A ship audit marked a pre-existing untracked directory as scope creep even though the directory was explicitly excluded and never entered the commit diff.
- **DO NOT**: Treat unrelated untracked working-tree entries as ship scope without checking whether the planned commit includes them.
- **INSTEAD DO**: Audit the effective ship-stage set (tracked diff plus files to be committed); report excluded pre-existing entries separately and block only when the commit or PR contains them.
