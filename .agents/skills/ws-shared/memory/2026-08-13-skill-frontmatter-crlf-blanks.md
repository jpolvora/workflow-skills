### [2026-08-13] build-site SKILL.md frontmatter CRLF blank-line accumulation
- **Layer**: Infrastructure
- **Module**: bin/build-site.js / skill-frontmatter.js
- **Severity**: High
- **Scenario / Context**: `npm run build-site:bump` rewrites every `.agents/skills/*/SKILL.md` YAML frontmatter on Windows with `core.autocrlf=true` (working tree CRLF, git blob LF)
- **DO NOT**: Slice the opening fence with `text.slice(4, end)` (assumes `---\n` is 4 chars). On CRLF the opening is `---\r\n` (5 chars), so the leftover `\n` becomes a new blank line after `---` on every bump.
- **INSTEAD DO**: LF-normalize first; match `/^---\n/` for the opening fence; strip leading/trailing blank lines from the extracted YAML; reconstruct `---\n${fm}\n---\n${body}`. Keep `.agents/skills/**/SKILL.md text eol=lf` in `.gitattributes`. Cover with `test/test-skill-frontmatter.js` (CRLF dirty → 0 blanks; second bump does not accumulate).
