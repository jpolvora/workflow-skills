Fix delivered in PR #312 (feature/us-311 → main).

Finished step artifacts now carry the step finish result (completed/failed/skipped) via a single validated derivation path, instead of mirroring the overall workflow status. Includes regression tests T1–T8 (intermediate completed/failed/skipped under an active workflow, close-step guard, fail-closed, singularity scan) with the full suite green, plus release 0.4.15 alignment.

PR: https://github.com/jpolvora/workflow-skills/pull/312
