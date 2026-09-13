<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/testing.md, mirrored 2026-09-11 for the versioned Locus Workflow guide bundle. content-sha256: 7d04da1620a3a39cf32cf135517d6dcc44f518412f08f4f483040e1a6743dc3c -->

# Testing and pilots

Use four distinct stages. Passing one never implies that the next stage ran.

## 1. Structural check

Call `workflow_validate` with `mode: "check"`, the draft ID, and its exact
integer revision. The server parses and type-checks the source against the
fixed `@withlocus/workflows` declaration without importing or evaluating the
module. It rejects unavailable bindings, unsupported imports, dynamic import,
runtime code-generation globals, and TypeScript syntax that Node's fixed
type-stripping runtime cannot erase.

A successful check has no provider activity and no outbound network. If source
changes, the digest/revision changes and the check must be repeated.

## 2. Fixture test

Add `tests/fixtures.ts` with a default function that returns deterministic JSON
or throws on failed assertions. Call `workflow_validate` with
`mode: "fixtures"`. It runs in an isolated sandbox with internet disabled and
without a live gateway capability, OAuth token, provider key, or refresh
token. An attempted real provider call must fail.

Test the customer's logic with exact expected row IDs and output fields. Cover
the relevant cases: duplicates, ambiguous and missing entities, explicit
`unknown` decisions, pagination, partial provider failures, rate limits,
filtering before expensive calls, and stable ordering under concurrency.
Fixture execution uses compute, but never provider credits; do not call it a
free operation unless the current product terms also include that compute.

## 3. Save the checked version

Call `workflow_definition` with `action: "save"`, the workflow ID, and the
checked revision. The server saves immutable source, runtime, bindings, and
validation evidence. It rejects an unchecked or stale revision. Saving is not
publishing, installing an invocation skill, scheduling, or authorizing a run.

## 4. Bounded live pilot

Ask before live execution. Call `workflow_run` with the saved integer version,
`mode: "pilot"`, representative consented input, a small `max_rows`, a hard
exact-decimal `max_charge_credits`, and a stable idempotency key. A pilot uses
the same sandbox and execution gateway as a production run; it can spend the
approved credits and contact the selected providers.

Poll with `workflow_runs({action:"get", run_id})` using the returned interval.
Pass only when durable evidence shows the expected output rows, dispatched
bindings, receipt IDs, exact ledger charge, and result artifacts. A natural
language claim of success, process exit code, or type-check result is not live
evidence.

Review every attempt. A changed source version, normalized input, mode, row
cap, or credit cap is a different run request and needs a different
idempotency key. A same-key replay must return the same run without another
charge. Only after a successful pilot should the user authorize the larger
production run.
