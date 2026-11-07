<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus/references/results-and-recovery.md, mirrored 2026-09-11 for the versioned Locus guide bundle. content-sha256: b96b72fc16bd145be2ad7525093d8826cfc30c1f638f3c06acfeb478f7ac0f74 -->

# Results and recovery

Persist the API call or capability run receipt before summarizing a paid
result. For truncated results, follow the returned continuation with
`get_call_result`. Keep raw data separate from an agent's interpretation.

A transport timeout is not evidence of pre-dispatch failure. Reuse the same
idempotency key to retrieve an identical logical call, or inspect its receipt
and status first. Never create a fresh key in a blind retry loop. Cancellation
blocks new work but cannot undo a completed provider effect or its valid cost.
