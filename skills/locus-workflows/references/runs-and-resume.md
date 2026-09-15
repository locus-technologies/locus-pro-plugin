<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/runs-and-resume.md, mirrored 2026-09-15 for the versioned Locus Workflow guide bundle. content-sha256: e88ca8b63a0c55197fdbd7bae2672998489a7b54cebccd78a408398c25dbf4be -->

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

For a provider-shape failure, read the already-stored response in bounded pages
with `workflow_runs({action:"call",run_id,call_id,max_characters})`. This is a
tenant-private diagnostic read and creates no new provider dispatch or charge.
Use it to fixture the raw body returned by hosted `row.call`; do not retry a
paid pilot merely to guess the response envelope.

For an ambiguous draft update, retry the identical `workflow_definition`
update with the same base revision, source or patch, and `idempotency_key`.
The server stores only a one-way key hash and returns the already-applied
revision when those identities match. A changed edit or base revision is a new
logical update and needs a new key.

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
