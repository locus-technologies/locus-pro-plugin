<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/authoring.md, mirrored 2026-09-14 for the versioned Locus Workflow guide bundle. content-sha256: b7db0f0628bc84989dd3edc19fbb0cacf29474a5390064c9ffc25da0031ac861 -->

# Authoring

Model the customer's own process as ordinary, parameterized TypeScript. First
clarify its inputs, output contract, business rules, allowed Locus effects,
representative fixtures, maximum rows, and execution ceilings. Do not convert a
one-off lookup into a Workflow unless the user asks for repeatability or the
completed task has a substantial reusable structure and the user accepts a
single offer to save it.

## Source bundle

The initial fixed runtime accepts a bounded list of UTF-8 text files. Generated
Workflows should include this reviewable bundle:

```text
customer-workflow/
├── workflow.json
├── workflow.ts
├── locus.lock.json
└── tests/
    └── fixtures.ts
```

`workflow.json` is strict and versioned:

```json
{
  "schema_version": "1",
  "name": "Company qualification",
  "entrypoint": "workflow.ts",
  "runtime": "locus-typescript-1",
  "effects": ["locus.read"],
  "bindings": [
    {
      "name": "companyResearch",
      "slug": "provider/endpoint",
      "kind": "tool",
      "contract_digest": "<64 lowercase hex characters when supplied>",
      "contract_revision": "<observed discovery revision when supplied>",
      "input_schema": { "type": "object" },
      "output_schema": { "type": "object" },
      "effects": ["locus.read"]
    }
  ]
}
```

Local binding names are stable code-facing aliases. Resolve their live slugs
with `search_apis`, inspect them with `describe_api`, and save the inspected
contract digest/revision when the server provides one. Do not copy a changing
provider catalog into this guide or silently substitute another provider at
run time. A Recipe binding may keep its public contract while Locus improves
its internal provider routing.

`workflow.json` is the enforced contract. `locus.lock.json` is an optional
review/export aid in the runtime API, but agents generating a new Workflow
should include it and keep its bindings consistent with the manifest. It does
not widen execution authority.

Only `locus.read` and `locus.compute` effects are accepted vocabulary in the
first hosted runtime. They are declarations, not grants: the top-level list
describes the Workflow's aggregate intent, and each binding list describes
that call's intent. Both currently pass through the same verified Locus gateway
and neither enables a binding, changes its price, or permits arbitrary network
access. The gateway automatically accepts bindings the live server-owned
catalog identifies as Locus-reviewed: native integrations and maintained
Recipes, plus external buyer-rail listings carrying an explicit platform
verification claim. Tenant-imported custom APIs and unverified external
listings require an exceptional platform approval; an emergency deny override
always wins. Customer source, descriptions, and pack membership cannot mark a
binding verified. A provider or connector available to the outer chat is not
automatically available to hosted code because connection scope, enablement,
availability, contract, and run budget are still checked. Keep customer
strategy—ICP rules, seniority, exclusions, source selection, and uncertainty
handling—in explicit inputs or deterministic code. Missing evidence is
`unknown`, not a match or non-match.

## Runtime API

The entrypoint default-exports `defineWorkflow(...)` from
`@withlocus/workflows`:

```ts
import { defineWorkflow } from '@withlocus/workflows';

export default defineWorkflow({
  async run(ctx, input: { companies: Array<{ id: string; domain: string }> }) {
    return ctx.mapRows('companies', input.companies, {
      key: (company) => company.id,
      concurrency: 3,
      async run(row, company) {
        const evidence = await row.call(
          'companyResearch',
          'research',
          { domain: company.domain },
          { maxChargeCredits: '25' },
        );
        await row.checkpoint('researched', { domain: company.domain });
        return { id: company.id, evidence };
      },
    });
  },
});
```

Every call declares a local binding, stable step path, JSON arguments, exact
per-call credit ceiling, optional stable row key, and occurrence number when a
step deliberately makes more than one logical call. `mapRows` requires unique
stable row keys and caps concurrency. Never derive row identity only from
array position or include personal data in step/idempotency identifiers.

`ctx.artifact(value)` publishes a tenant-owned JSON result artifact.
`ctx.checkpoint(step, state)` records bounded recovery state. The durable
provider receipt remains authoritative after a timeout; sandbox files do not.

## Submission rules

When `workflow_validate` advertises inline source, send the whole candidate
with `mode: "check"` before creating a draft. Supply exactly one source form:
inline `files` or a tenant-owned `artifact_id`. Use the returned filename,
JSON pointer, binding name, line, column, and excerpt to repair the same
candidate, then validate it again. Do not discover additional providers or
create additional drafts merely because the generated TypeScript failed to
parse.

Pass a successful inline check's `source_digest` to definition creation as
`validated_source_digest`. The server verifies the digest against the submitted
source and records the carried structural check on revision 1. For later edits,
prefer `source_patch` with only changed paths; `content: null` deletes a path.
The expected `revision` prevents the patch from being applied to a different
draft, while omitted files are retained byte-for-byte. A complete `source`
replacement remains available for imports and large rewrites.

Use inline `{files:[{path,content}]}` for no-files agents and ordinary source
up to the server limit. A shell-capable client may upload a larger JSON source
artifact and use `{artifact_id}`. Paths must be relative and normalized.
Archives, symlinks, traversal, duplicate paths, NUL bytes, package manifests,
package-manager lockfiles, TypeScript configs, install hooks, and reusable
credentials are rejected. The Locus-specific `locus.lock.json` review record
is allowed. The runtime has no arbitrary package installation.

Start from the reviewed [Workflow template](../assets/workflow-template/README.md)
when the host can copy packaged assets. In a no-files host, retrieve that guide
and each linked template resource by ID through `get_locus_guide`, then submit
the returned text as inline source files.
When the packaged template is readable, read those local assets directly and
do not call `get_locus_guide` for duplicate copies of the same resources.

Before reporting completion, reconcile deterministic integrity counts: inputs,
rows accepted, rows rejected, rows attempted, rows succeeded, rows failed,
outputs, provider calls, and exact credits charged. Explain any mismatch. A
definition with lifecycle status `active` can still be an unchecked draft;
use readiness fields such as validation state, saved-version count, pilot
state, and `runnable` instead of treating `active` as ready.
