### [2026-09-29] Walk path segments before containment
- **Layer**: Security
- **Module**: resolve_skill_path
- **Severity**: High
- **PathPattern**: **/*resolve_skill_path*
- **Scenario / Context**: A lexical path stays inside the repo while a directory junction points outside.
- **DO NOT**: lstat only the final file after existsSync, which follows intermediate links.
- **INSTEAD DO**: lstat each segment from the root and refuse a symlink or junction before the read.
