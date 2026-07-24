---
id: 113
slug: us-113
title: "[bug] cli: update fails post-verification when consumer workspace has repo-local custom skills"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/113"
specDate: 2026-07-23
---

# Specification — [bug] cli: update fails post-verification when consumer workspace has repo-local custom skills

**State:** open

## Description

### Summary
When running \workflow-skills update\ (or \update --include-new\) in a consumer workspace that has repo-local custom skills (skills present under \.agents/skills/\ that are tracked in \installed-skills.json\ but not part of the upstream \workflow-skills\ package, e.g., \security-review\, \io-review\), the update completes the skill copy but then fails post-verification with exit code 1.

### Error Output
\\\	ext
Note: 2 tracked skill(s) not in this upstream package (left as-is):
  - bio-review
  - security-review
...
Updating 30 skill(s)...
...
Integrity: consumer tree mismatch after copy (no automatic rollback)
  - bio-review (missing-from-manifest)
  - security-review (missing-from-manifest)
\\\

### Root Cause
In \in/cli.js\ within \unUpdate()\:
1. \unUpdate()\ correctly identifies custom consumer skills not present upstream:
   \const staleLocal = tracked.filter((name) => !upstreamSet.has(name));\
2. \unUpdate()\ prints a helpful note stating that \staleLocal\ skills are left as-is.
3. However, after copying updated skills, \unUpdate()\ reads \^GfterManifest = readInstalledSkillsManifest()\ and passes \erifyIds = afterManifest.skills\ to \postVerifyAndWriteLocal()\.
4. \postVerifyAndWriteLocal()\ evaluates \erifyIds\ (which includes \staleLocal\) against \upstreamIntegrityManifest\ (\in/skill-integrity.json\).
5. Because \staleLocal\ skills are custom repo-local skills and do not exist in \upstreamIntegrityManifest\, \erifyClosure()\ reports them as \missing-from-manifest\, causing the CLI to exit with code 1 unless \--force-integrity\ is passed.

### Suggested Fix
In \in/cli.js\ (\unUpdate\), \erifyIds\ should filter out \staleLocal\ skills (skills not in \upstreamSet\), so that post-verification only evaluates upstream skills against the upstream integrity manifest:

\\\javascript
// Filter out local consumer skills that are not part of upstream package
const verifyIds = afterManifest
  ? afterManifest.skills.filter((n) => upstreamSet.has(n) && fs.existsSync(path.join(targetSkillsDir, n)))
  : skillsToCopy.filter((n) => fs.existsSync(path.join(targetSkillsDir, n)));
\\\

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
