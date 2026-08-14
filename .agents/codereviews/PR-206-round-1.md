# PR 206 round 1

- Thread `PRRT_kwDOTFajc86ZJDkV` (WARNING, score 7): `isCitingFromPublishedSkillFolder` now treats a citing file as a published skill when it sits under `_abs.skillsRoot` or `_abs.globalSkillsRoot`, so hybrid/global `--skill` fallback keeps `docs/` file-relative (issue #205).
- Tests: `node test/test-ws-doctor.js` exit 0 (new global-skill cases green); `npm run test` exit 0; `npm run verify-integrity` OK.
