### [2026-09-19] Ship must bump the release version when the branch version equals the base

- **Layer**: `devops`
- **Module**: `release ship`
- **Severity**: `High`
- **PathPattern**: `package.json`
- **Scenario / Context**: Step 8 pushed a package-content PR with `package.json` 0.4.38 identical to the merge base, reasoning that a prior merged worker PR had shipped without a bump. The review bot filed a WARNING (score 7): the repo release contract requires the shipping PR to carry the strict bump, and prior release runs did bump inside the run. Fixed with `npm run build-site:bump` plus integrity regen in the fix-pr round.
- **DO NOT**: Rationalize skipping a mandatory release rule with merged-PR precedent anecdotes; an equal version on a package-content branch is a real defect even when an earlier PR got away with it.
- **INSTEAD DO**: When the branch version equals the merge-base version on a package-content PR, run `npm run build-site:bump`, then `npm run generate-integrity` plus `verify-integrity`, and commit the bump with ship-scope changes — one patch bump per release PR.
