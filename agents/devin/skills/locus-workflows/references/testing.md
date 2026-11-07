<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/testing.md, mirrored 2026-09-17 for the versioned Locus Workflow guide bundle. content-sha256: 581627cacc6693f53ac6641ed9edc43372778dd035752e16520045fdf43e9963 -->

# Testing and pilots

Use four distinct stages. Passing one never implies that the next stage ran.

## 1. Structural check

Before creating a draft, call `workflow_validate` with `mode: "check"` and
exactly one inline source form (`files` or `artifact_id`) when the server
advertises that shape. After persistence, call it with the draft ID and exact
integer revision. The server parses and type-checks against the fixed
`@withlocus/workflows` declaration without importing or evaluating the module.
It rejects unavailable bindings, unsupported imports, dynamic import, runtime
code-generation globals, and TypeScript syntax that Node's fixed type-stripping
runtime cannot erase.

Diagnostics identify a file and, when available, line, column, and a bounded
source excerpt. Repair the same candidate deterministically and check again.
Do not use definition creation as a syntax probe.

A successful check has no provider activity and no outbound network. If source
changes, the digest/revision changes and the check must be repeated.

## 2. Fixture test

Add `tests/fixtures.ts` with a default function that returns deterministic JSON
or throws on failed assertions. Import pure parsers and transformations from
`../workflow.ts`; do not substitute a list of case names for executable tests.
Call `workflow_validate` with
`mode: "fixtures"`. It runs in an isolated sandbox with internet disabled and
without a live gateway capability, OAuth token, provider key, or refresh
token. An attempted real provider call must fail.

Test the customer's logic with exact expected row IDs and output fields. For a
simple Workflow, one small runnable happy-path fixture plus a fail-closed gate
is sufficient. Add duplicates, ambiguous or missing entities, explicit
`unknown` decisions, pagination, partial provider failures, rate limits,
filtering before expensive calls, and concurrency ordering only when those
cases are relevant to the user's business rules. Fixture results report
assertion counts, provider activity, and outbound network activity. Complete
requested checks, fixtures, and save operations without pausing for another
confirmation.

## 3. Save the checked version

Call `workflow_definition` with `action: "save"`, the workflow ID, and the
checked `revision`. The server saves immutable source, runtime, bindings, and
validation evidence. It rejects an unchecked or stale revision and returns the
saved version plus current pilot/runnable readiness. Saving is not publishing,
installing an invocation skill, or scheduling.

## 4. Bounded live pilot

For a requested live test, call `workflow_run` with the saved integer version,
`mode: "pilot"`, representative input, a bounded `max_rows`, a hard
exact-decimal `max_charge_credits`, and a stable idempotency key. A pilot uses
the same sandbox and execution gateway as a production run; it can consume
credits within the submitted ceiling and contact the selected providers.

The compact MCP call is exactly:

```text
workflow_run({
  workflow_id,
  version,
  input,
  mode: "pilot",
  max_rows,
  max_charge_credits,
  idempotency_key
})
```

Omit `action` or set it to `"submit"`; do not rename `input` to
`workflow_input`. The separate
`workflow_runs` inspection tool uses `action` for operations such as `get`,
`call`, `artifact`, `cancel`, and `resume`.

An outer host can independently block effectful tools. If it does, report that
host-policy result; do not weaken the Workflow credit cap or create a different
run request to bypass it.

Poll with `workflow_runs({action:"get", run_id})` using the returned interval.
Pass only when durable evidence shows the expected output rows, dispatched
bindings, receipt IDs, exact ledger charge, and result artifacts. A natural
language claim of success, process exit code, or type-check result is not live
evidence.

The run's `charged_credits` and receipt records are authoritative accounting.
A global `get_balance` delta cannot attribute cost to this run because other
workspace activity may occur concurrently.

The platform's pilot readiness records execution completion, not whether the
customer's business output is useful. Treat `pilot_output_quality` as
`not_evaluated` until the caller checks the expected fields and invariants in
the result artifact. A fail-closed null is valid runtime behavior but cannot
satisfy a required live output. Try other available bindings or retrieval
strategies; if none can establish the requested evidence, report the pilot as
not meeting the requested outcome. Do not weaken a quality gate or promote an
empty-but-successful run.

Review every attempt. A changed source version, normalized input, mode, row
cap, or credit cap is a different run request and needs a different
idempotency key. A same-key replay must return the same run without another
charge. Production mode is available only after a successful pilot of that
exact saved version.
