### [2026-09-03] Generated site labels must match the taxonomy source and guards need symmetric tests
- **Layer**: harness
- **Module**: bin/build-site.js
- **Severity**: Medium
- **PathPattern**: `bin/build-site.js`, `docs/index.html`, `test/test-install.js`
- **Scenario / Context**: Site revamp hand-set catalog filter pills that contradicted the CATALOG.md layer taxonomy (dead Layer 3 filter, mislabeled Layer 1); installer scope guard existed on install but had no symmetric negative test on update
- **DO NOT**: Hardcode display labels in generated-site templates that restate a taxonomy owned elsewhere, or add a guard on one command without the mirrored negative test on its sibling command
- **INSTEAD DO**: Derive display labels from the canonical taxonomy (or assert pill labels against layer assignments in test-doc-sync); add fail-closed tests for every scope-gated flag on each command that parses it
