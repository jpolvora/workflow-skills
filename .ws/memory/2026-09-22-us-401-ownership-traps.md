### [2026-09-22] Ownership-contract test traps: self-reference, scenario order, CRLF anchors

- **Layer**: `Tests`
- **Module**: `test-git-ownership-contract`
- **Severity**: `Medium`
- **PathPattern**: `test/test-*.js`
- **Scenario / Context**: During us-401, a contract test asserting cross-doc references failed on the canonical doc itself; ordered temp-repo git scenarios put the mutating STOP case first so its upstream commit poisoned the later success-case diff; multi-line exact-match edits failed on CRLF skill files.
- **DO NOT**: assert every doc in a surface list references the canonical contract file without exempting the canonical file itself; order temp-repo scenarios with a mutating STOP case before a success case that assumes the earlier baseline; use multi-line exact-match finds on CRLF files.
- **INSTEAD DO**: exempt the canonical doc and assert its content directly; run success/idempotency scenarios first and the foreign-overlap STOP last; anchor edits on single-line strings when the file has CRLF endings.
