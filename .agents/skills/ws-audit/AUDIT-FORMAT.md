# Runtime audit log format

Referenced by [`SKILL.md`](SKILL.md). Finding schema for `{us-dir}/audit-{slug}-{timestamp}.log.md`.

## Log file

- Path: `{us-dir}/audit-{slug}-{ISO8601}.log.md`
- Language: en-us
- Append-only during run; finalized at workflow end

## Finding fields

| Field | Required | Values |
|-------|----------|--------|
| `timestamp` | yes | ISO-8601 UTC |
| `step` | yes | Orch step id (0–9) or `bootstrap` / `finalize` |
| `skill` | no | `ws-*` skill id when known |
| `category` | yes | `script` \| `tool` \| `io-validation` \| `dispatch` \| `other` |
| `severity` | yes | `error` \| `unusual` \| `info` |
| `summary` | yes | One-line description |
| `evidence` | no | Short excerpt (stdout, path, gate id) |
| `recovered` | yes | `true` if model/workflow recovered after the anomaly |

**Critical rule:** `recovered: true` does **not** suppress the finding when skill content was wrong.

## Markdown body template

Each finding is a `### Finding` subsection with a bullet list of fields.

## Issue draft

When `severity: error` count ≥ 1 at finalize, `draftIssueBody` builds a GitHub issue title + body for the upstream repo (`skill-dependencies.json` → `upstream.repo`).
