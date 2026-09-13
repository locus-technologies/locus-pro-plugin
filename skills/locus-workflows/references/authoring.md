<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-workflows/references/authoring.md, mirrored 2026-09-11 for the versioned Locus Workflow guide bundle. content-sha256: 61f88ecb515fad9245031a30978d647e69a21f31769bfa7c3fd3bb177870224e -->

# Authoring

Model the customer's own process as ordinary, parameterized TypeScript. First
clarify its inputs, output contract, business rules, allowed Locus effects,
representative fixtures, maximum rows, and maximum spend. Do not convert a
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

Only `locus.read` and `locus.compute` effects are supported in the first hosted
runtime, and the platform separately maintains a fail-closed allowlist of
reviewed slugs for those effects. A declaration in customer source cannot add a
binding to that allowlist. A provider or connector available to the outer chat is not
automatically available to hosted code. Keep customer strategy—ICP rules,
seniority, exclusions, source selection, and uncertainty handling—in explicit
inputs or deterministic code. Missing evidence is `unknown`, not a match or
non-match.

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
