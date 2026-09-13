<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/runs-and-resume.md, mirrored 2026-09-11 for the versioned Locus Workflow guide bundle. content-sha256: 4e196aa595194b572cb0303412524721ceb0610489bacbee6b31c1b21473ee97 -->

# Runs, cancellation, and resume

Keep the run ID separate from validation IDs and provider `api_call_id`
receipts. Poll `workflow_runs` with `action: "get"`; do not pass a Workflow run
ID to `get_call_result`. A bounded run response includes the exact version and
source/input/binding digests, state, timestamps, maximum/charged/reserved
credits, call summaries, provider receipt IDs, errors, events, and artifact
metadata. Follow the server's polling hint for nonterminal states.

Distinguish `queued`, `provisioning`, `running`, `waiting_on_provider`,
`waiting_on_approval`, `succeeded`, `partial`, `failed`, `canceled`, and
`expired`. `partial` means some durable work succeeded but the complete output
is not established. A missing final result, unsettled reservation, or agent
claim without an artifact/receipt is unverified.

When the run summary lists an output or log artifact, read it in bounded pages
with `workflow_runs({action:"artifact",run_id,artifact_id,max_characters})` and
continue with the returned cursor. The server verifies that the artifact
belongs to the authenticated account and the named run; an ID is never
authorization by itself.

## Timeout or ambiguous provider response

Inspect the existing run first. Find the logical call and receipt. Do not
create a new run, change the occurrence, or choose another provider merely
because the client or sandbox timed out. The gateway will replay a settled
logical call and will not add its charge twice. A still-dispatched call remains
reserved until the receipt path reconciles it.

## Cancel

`workflow_runs({action:"cancel",run_id})` revokes new dispatch immediately and
requests sandbox termination. Reserved calls that never dispatched are
released. In-flight calls remain reserved until their eventual outcome is
known. Completed work and provider charges stay visible. Cancellation does not
mean rollback.

## Resume

Resume only `failed`, `partial`, or `expired` runs. The server reuses the same
run, source, version, normalized input, logical call identities, receipts, and
remaining budget while deriving fresh short-lived authority from the current
connection. Current authorization and binding availability are rechecked.
Changed source or inputs require an explicit new version/run; do not silently
repair or substitute a saved binding.

After recovery, verify the stored result artifact, row/step counts, every
failed or unsettled call, and the exact total charged. Saving, installing a
private conversational launcher, publishing it, and scheduling it remain four
separate user decisions.
