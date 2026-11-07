# GTM enrichment Workflow template

This maintained template batches the first-party `locus-gtm/enrich` recipe
without reimplementing its provider waterfall. It supports person or company
records, named enrichment profiles, exact requested fields, stable row IDs,
per-record recipe ceilings, and a separate hard ceiling on the complete run.
The template defaults the per-record ceiling internally; keep it out of the
required customer input unless the customer explicitly asks to tune it.

Copy the [manifest](workflow.json), [source](workflow.ts),
[binding lock](locus.lock.json), and [fixture tests](tests/fixtures.ts) together.

For a first pilot of one record, retain the maintained `locus-gtm/enrich`
recipe binding and its default contact-verification quality gate, but prune or
replace the batch-only records array, concurrency and row-mapping interface,
aggregate output, and unrelated fixtures. Complete the inline check, one draft,
minimal relevant fixtures, immutable save, and bounded pilot before expanding
the Workflow for batches.

Before submitting it:

1. Call the contract-inspection tool advertised by the connection (`describe`
   on the compact surface or `describe_api` on the legacy surface) for
   `locus-gtm/enrich` and confirm `workflow_binding.eligible` is `true`.
2. Copy the returned `contract_digest`, `contract_revision`, input schema, and
   output schema into `workflow.json` and `locus.lock.json`.
3. Customize the input/output parsers and deterministic fixtures for the
   downstream contract. Missing fields must remain explicit; do not turn
   `missingFields` into a negative fact.
4. Create the draft while carrying the inline check digest, run `fixtures`, and
   save that revision. For a requested live test, run a bounded pilot. A
   production run is rejected until that exact version has a successful pilot.

For a narrow work-email or named-field request, omit `profile` and pass only
the exact `requestedFields`. Use `profile: "person_contact"` only when the user
requests the full work-contact bundle, and `profile: "company_core"` for a full
company-core record. Contact verification defaults to required: retain both
field provenance and `contactVerification.verifications`, and never turn a
rejected candidate into a fact. Phone-only person records are invalid because
the recipe has no reliable reverse-phone identity resolver.

Hosted calls return the recipe body directly. Read normalized values from the
field map, for example `result.fields["person.fullName"]?.value`, not from a
flat `result.person` object. A work email passes the default gate only when the
matching `contactVerification.verifications` entry has
`field: "person.workEmail"`, `status: "verified"`, and acceptable checks such
as `checks.valid: true`; fixture this exact body shape before the pilot.

BYOK `custom-*` bindings can be added to a separate customer Workflow when the
exact tenant slug is enabled and Workflow-eligible. Provider credentials stay
in the encrypted Custom API configuration and never belong in these files.
