### [2026-09-18] user-gate option-count portability cap
- **Layer**: `harness`
- **Module**: `ws-shared runtime gates / setup resume`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/runtime/*.md`
- **Scenario / Context**: The setup.md unfinished-workflow resume gate rendered one question with N+2 options (resume #1..N + start-new + cancel). With 3 unfinished standard workflows the host structured-choice tool rejected the request (`question resume-select must have 2-3 options, got 4`), stalling bootstrap before any workflow work. Contract files only said ">=2 options" with no ceiling, so agents assumed unlimited options.
- **DO NOT**: Render one user-gate question with an unbounded or 4+ option list (resume pickers, combined menus), or add Cancel as a numbered option where dismiss already means HS-1.
- **INSTEAD DO**: Keep at most 3 options per question (gates.md rule 8): ask intent first, then page picks with More workflows navigation; N==1 resumes directly; Cancel stays dismiss (HS-1). Lock the template with test/test-user-gate-option-cap.js and keep every documented branch reachable across the chunked stages.
