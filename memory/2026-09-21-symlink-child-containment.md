### [2026-09-21] Containment gates must resolve the target's own parent, not only the configured root

- **Layer**: `Infrastructure`
- **Module**: `ws-patterns-generator seed script`
- **Severity**: `Critical`
- **PathPattern**: `.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs`
- **Scenario / Context**: Round 1 resolved the configured skills root (`realpathLoose(skillsRoot)`) and still built the target from lexical leaves (`join(resolvedSkillsRoot, GENERATED_ID, 'SKILL.md')`). A `<skillsRoot>/ws-project-patterns` directory that is itself a symlink/junction to a path outside the repo therefore stayed lexically inside the root, passed the gate, and `writeFileSync` followed the link out of the repository. Review re-raised it as CRITICAL (score 9) on the next push: the first fix was partial.
- **DO NOT**: Treat "resolve the root" as complete containment when the target path has intermediate directories that callers do not control. Do not probe existence with `fs.existsSync` in the walker: it follows links, so a link whose target is missing looks absent and the path silently degrades to a lexical comparison.
- **INSTEAD DO**: Resolve the target's **own parent** (`realpathLoose(path.dirname(target))`) and rejoin the basename before the containment compare; probe with `fs.lstatSync` so a link counts as existing even when its target does not; fail closed (refuse the write) when real resolution is impossible. Test the linked child directory case, not only the linked root, plus an in-repo child link as the positive control.
