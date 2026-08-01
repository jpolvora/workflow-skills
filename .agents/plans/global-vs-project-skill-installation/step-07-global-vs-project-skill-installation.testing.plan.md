# Testing Plan - global-vs-project-skill-installation

**Source Plan:** `.agents/plans/global-vs-project-skill-installation/step-01-global-vs-project-skill-installation.plan.md`

## 1. Test Strategy & Commands

- **Unit & Integration Suite:** `npm run tests`
- **Package Integrity Suite:** `npm run verify-integrity`
- **Harness Audit:** `ws-check-harness`

## 2. Test Battery Details

1. **Self-Overwrite Protection & Target Path Resolution:** Verify CLI refuses install on upstream root and resolves `WORKFLOW_SKILLS_GLOBAL_DIR`.
2. **Global Skill Installation & Logging:** Verify `install --global --skills ws-tdah --yes` writes to global skills directory and outputs `Global Scope`.
3. **Global Update:** Verify `update --global` updates installed global skills.
4. **Global Uninstall & Local Override Coexistence:** Verify `uninstall --global` removes global skill while preserving project-level `.agents/skills/ws-tdah`.
5. **Quality Gates & Integrity Checks:** Verify full test battery and integrity digests exit 0 cleanly.
