### [2026-07-16] Installer non-interactive + local pack dual path
- **Layer**: `N/A`
- **Module**: `installer / bin/cli.js / test-install`
- **Severity**: `Medium`
- **Trap Avoided**: Documenting `github:…@latest` as a “cache bust” is wrong (npm exit 128 before CLI starts). Interactive per-skill Overwrite + bare `console.clear()` hangs agents on piped stdin. Local `--local` tests mix two CLIs: Phase 1 runs packed `npx workflow-skills` from the tarball; Phases that spawn `bin/cli.js` hit the working tree — editing CLI then skipping re-pack can make Phase 1 exercise stale installer while source-path phases look green.
- **Solution**: Never recommend `@latest`/`@main` on `github:` — use `npx --yes github:jpolvora/workflow-skills` + cache clear; document exit 128 in help/README. Use `install --full|--package|--skills --yes` for CI; one-shot overwrite on TTY; hard-fail non-TTY without `--yes`. Guard `console.clear` with `stdout.isTTY`. After CLI edits, run `npm run tests -- --local` so pack + source paths both exercise the new code.
