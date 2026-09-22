### [2026-09-20] Wiki sweep follow-through traps

- **Layer**: `Tests`
- **Module**: `wiki-sweep`
- **Severity**: `Medium`
- **PathPattern**: `.agents/specs/wiki/**, bin/build-wiki-site.js`
- **Scenario / Context**: A bounded ws-wiki sweep added slug-form spec ids (`0097-us-354`) to page provenance and wrote a relocation sentence naming the retired consumer-hub path. Both broke post-sweep gates: the site builder infobox regex accepted digits only and truncated slugs, and `test-shared-hub-paths.js` failed on the retired-path literal.
- **DO NOT**: assume site-builder extraction regexes accept the same id shapes that specs and wiki prose now use, nor write wiki sentences that name retired paths even as historical contrast.
- **INSTEAD DO**: after any sweep, run `test-site-wiki.js` + `test-doc-sync.js` + `test-shared-hub-paths.js` before ship; keep builder regexes slug-open (`([^\n.]+)`-style); phrase relocation history with tokens (`{sharedDir}` / `{skillsRoot}`), never retired literals.
