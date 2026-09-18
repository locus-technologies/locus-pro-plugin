<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/hosted-execution.md, mirrored 2026-09-11 for the versioned Locus Workflow guide bundle. content-sha256: be12ca68556ab55d56c97a7aa6e7b589d4c1b17530818e0adc96ce0aefa34b4b -->

# Hosted execution

Personal-account execution is hosted under the existing authorized connection.
The worker is a derived run principal, not a new agent connection or OAuth
client. Locus policy, budget enforcement, durable state, and billing remain on
the server; customer code runs only in an isolated sandbox with a narrow
execution gateway.

The server derives tenant, credit account, parent grant/client, environment,
saved source and input digests, allowed bindings, effect policy, maximum rows,
maximum credits, expiry, and a nonce from the authenticated submission. A run
does not consume another connected-agent slot. User-supplied account IDs or
credentials never establish ownership.

The execution service creates one sandbox for the complete Workflow, not one
per API call. The approved image already contains the fixed runtime and SDK;
uploaded package manifests and install hooks are rejected. Customer source
receives only run metadata and the gateway URL. The sandbox provider applies a
short-lived capability header outside customer code. Public inbound traffic is
disabled, and outbound traffic is denied except to the exact Locus gateway
host. Fixture mode disables outbound traffic entirely.

Every gateway call re-reads the durable run and current parent grant. Revoking
the original OAuth/agent/server grant, freezing the account, canceling the run,
changing the environment, expiring the capability, or requesting a binding
outside the saved allowlist blocks new dispatch. The run can never enable
tools, add connections, change plan, raise its budget, or mint broader
authority.

The gateway atomically reserves exact credits across concurrent calls before
dispatch. Logical call identity is server-derived from run, stable step, hashed
row identity, and occurrence. Arguments are stored with a digest. Retries use
the same provider idempotency identity, persist the raw outcome/receipt before
returning to the sandbox, and apply charge totals once. A dispatched call that
has not settled keeps its reservation and requires reconciliation; timeout is
not failure.

Do not assume arbitrary egress, direct provider credentials, durable sandbox
filesystems, external connectors, arbitrary dependencies, publication, or
scheduled execution. Source, inputs, checkpoints, receipts, outputs, and logs
are tenant-owned durable Locus records. The sandbox is replaceable compute,
not the system of record.
