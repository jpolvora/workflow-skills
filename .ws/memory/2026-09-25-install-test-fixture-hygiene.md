### [2026-09-25] Install-test phases must snapshot LF-pinned repo fixtures; install tests run only via npm-run env

- **Layer**: Tests
- **Module**: test-install.js / us-419 AC5 EOL assertion
- **Severity**: Medium
- **PathPattern**: `test/test-install.js`, `test/.ws/.gitignore`
- **Scenario / Context:** Suite entry #1 `test-install.js` spawns the CLI with cwd=test/ for project-scope phases, so the installer byte-copies the CRLF worktree `hub.gitignore` template over the LF-pinned `test/.ws/.gitignore` fixture (`.gitattributes` pins `test/.ws/** text eol=lf`). Entry #104 `test-ws-us419-followups.js` AC5 then fails on the EOL-dirty file. Separately, standalone `node test/test-install.js --local` fails the secrets-hook phase (`node not on PATH` under git-bash) because only `npm run` puts the node binary dir on PATH.
- **DO NOT:** Let install-test phases mutate repo fixtures without restoring exact bytes; run `test-install.js` standalone and treat hook/PATH failures as product bugs.
- **INSTEAD DO:** Snapshot exact fixture bytes at file top and restore in a `process.on('exit')` hook (runs even on `fail()`); always run install tests via `npm run test(s)`; verify with `git status --porcelain` that only intended files are dirty.
