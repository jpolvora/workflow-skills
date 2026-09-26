# ws-tdah

Action-first unverbose replies, anti-slop clarity, and operational judgment. One mode. Replaces retired `ws-gabarito`.

## What it does

**Shape:** next action, numbered steps, state line, one concrete next step, lists capped at 5.

**Anti-slop:** premise first, grounded project nouns (`STACK.md`, codebase symbols), no buzzword stacking or invented AI jargon. Concision cuts noise without degrading into cryptic caveman fragments.

**Re-pitch (`/wait-what`):** when comprehension breaks down ("wait", "you lost me", `/wait-what`), the agent backs up to supply the missing premise in ASD-STE100 Simplified Technical English, making the reply shorter and clearer rather than shorter and blunter.

**Judgment:** challenge weak plans, ask when blocked, verify risky facts, consult MEMORY on mutating work.

Stays on until `stop ws-tdah` / `stop verbosity` / `normal mode` (or `stop ws-gabarito` / `sem ws-gabarito`).

## How to invoke

```
/ws-tdah              # start (only mode)
/tdah                 # same
start ws-tdah         # same
start ws-gabarito     # alias (retired name)
/wait-what            # re-pitch last response with missing premise
re-pitch              # same
stop ws-tdah          # normal prose
stop ws-gabarito      # same
```

## Examples

See [`EXAMPLES.md`](EXAMPLES.md) (compression, anti-sycophancy, and `/wait-what` re-pitch).

## See also

- [`SKILL.md`](./SKILL.md) — agent contract
- [Repository README](https://github.com/jpolvora/workflow-skills) — install / overview

