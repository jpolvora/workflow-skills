# Feature Boundary

This companion records the one user-facing implementation choice for `ws-doctor-json-esm`: how `doctor.js` declares itself as an ES module when copied out of the upstream package root.

In scope: `ws-doctor` entrypoint load + `--json` stdout isolation (GitHub #260, amended #261).

Out of scope: issue #262 (foreign skill), issue #259 (stale / not this package), root `package.json` `"type"` edits, JSONL output, other skills' `.cjs` helpers.

# Implementation Decisions

**Chosen default: ship `.agents/skills/ws-doctor/package.json` with `"type": "module"` (and a name/private stub as needed).**

Reasons:

1. Node resolves module type from the nearest `package.json` to the *file*, walking up from `scripts/doctor.js`. A skill-local file makes consumer and global copies ESM without depending on the consumer root.
2. `test/test-ws-doctor.js` already uses this shape (writes `{"type":"module"}` next to copied `doctor.js`). Promoting that file into the skill is the smallest product change.
3. The documented launcher stays `node {skillsRoot}/ws-doctor/scripts/doctor.js`. SKILL.md, evals, and tests keep the `.js` filename.
4. Root `package.json` already has `"type": "module"`. Do not touch it (#261 as filed is a no-op).

`--json` stdout: keep a single `JSON.stringify` payload on stdout (`process.stdout.write` plus newline is acceptable). Persist messages stay on stderr. Do not switch to JSONL.

# Deferred Ideas

- Rename `doctor.js` to `doctor.mjs` instead of a skill-local `package.json`. Valid, but it churns SKILL.md, tests, and every citation of `doctor.js` for the same Node behavior.
- Tighten `resolveCitedPath` so skill-folder markdown `[README.md](README.md)` is file-relative (latent cousin of #205). Issue #259 did not reproduce on this tree; leave it for a later spec if hybrid/global scans start false-positive.
- Fix `INDEX-TEMPLATE.md` / `ws-tdah/README.md` `../../../README.md` links for global-install walk-up. Not in the validated issue set.
