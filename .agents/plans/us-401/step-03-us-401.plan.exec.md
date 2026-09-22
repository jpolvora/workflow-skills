# Step 3 — Task breakdown (us-401)

`defaults.enableDag` is false and all file sets are doc/small-script edits by a
single inline worker: **execMode sequential**. No DAG levels, no parallel
dispatch, no file overlap to partition.

Order: canonical doc → setup.md → PROTOCOLS.md → fix-pr pointer → cleanup
comment → schema → refresh_baseline.cjs → gates.md → tools.md → AC6 pointers
(lite, multi, orch) → regression test → integrity regen → self-verify.
