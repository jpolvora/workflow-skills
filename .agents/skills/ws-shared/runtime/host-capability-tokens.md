# Host Capability Tokens

Portable capability vocabulary for tool choice. Skill bodies reference these tokens (capability
names only — never host product tool IDs) and resolve them per host at runtime through the
`capabilities` map of the cached entry in `{sharedDir}/host-capabilities.json` (dispatch aliases
are mirrored under `binding`). Resolution protocol: [`host-dispatch.md`](host-dispatch.md)
§2. Probe script: [`scripts/probe_host_capabilities.cjs`](scripts/probe_host_capabilities.cjs).
Pre-mapped host shapes: [`host-tool-map.json`](host-tool-map.json).

## Decision note (refine-and-implement)

Workflow startup already probed model+toolkit capabilities into a cache file, but agents still
shelled out for native-capable operations (observed symptom: an agent writing "Writing the spec
with the Write tool to avoid shell quoting issues" — it shelled out instead of using a native
file tool). Abandon was rejected: the gap is accidental (agents cannot see the native tool), not
an intentional preference, and the fix is additive on top of the probe-once/cache design. Only
approval proceeds to mapping work — this document is that approval record.

## Vocabulary

| Token | Meaning | `tools.md` alias |
|-------|---------|------------------|
| `{readFile}` | Read file content natively | `Read` / `search-code` |
| `{writeFile}` | Create or overwrite a file natively | `Write` (`write-state`) |
| `{editFile}` | Targeted in-place file edit natively | `StrReplace` (`write-state`) |
| `{shellExec}` | Run shell commands, builds, tests, scripts | `Shell` (`run-script`) |
| `{dispatchAgent}` | Spawn a subagent for step work | `dispatch-agent` |
| `{askQuestion}` | Structured-choice user gate | `user-gate` |
| `{browserVerify}` | Browser UI verification | `browser-mcp` |

## Cache-query-first ordering

Before choosing how to act, query the cached host-capabilities entry for the current
`hostId::orchestratorModel` key and prefer the bound native tool over shell equivalents:

1. Read the cache entry (miss → run the probe script once, then re-read).
2. When the token resolves to a bound tool, use it — do not shell out for the same operation.
3. When the token resolves to `none`, use the documented fallback ladder
   (`host-dispatch.md` §3 Tier 2/3) — a missing native tool is normal, never an error.

## Effective resolution precedence

When several sources describe the same token, the most specific wins:

1. Host-declared tools from the live probe (highest).
2. Pre-mapped names in `host-tool-map.json` for the matched host shape.
3. Minimal safe fallback (`{shellExec}` bound, everything else `none`) for unknown hosts.

Omitted or unreadable sources fall through to the next level; an unknown host degrades to the
minimal set and never fails startup.

## Invalidation rule

The cache entry is keyed by `hostId::orchestratorModel` and reused across every step of the run —
no per-step re-probing. Re-probe only when one of these holds: explicit `--refresh` flag, host or
toolset change, explicit rebind, or a different session key. Stale entries that hide newly
available tools are worse than re-probing, so any of those four conditions discards the entry and
probes once.
