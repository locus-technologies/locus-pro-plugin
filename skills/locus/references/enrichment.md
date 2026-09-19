<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus/references/enrichment.md, mirrored 2026-09-18 for the versioned Locus guide bundle. content-sha256: f39d4f654d1815a1aa30c393cd2ef5ca55f0cec99e745f3d68c52e4a0d80be0a -->

# Entity enrichment

Resolve a stable person or company identity before merging fields. Preserve
field-level source evidence, distinguish no match from an explicit negative,
and represent ambiguous or unavailable data as unknown. Deduplicate on durable
identifiers where possible, not display names alone.

For a person-and-work-email request, use this provider-neutral sequence:

1. Establish the current company and role from public/current evidence.
2. Search the live catalog for people discovery and resolve the intended
   identity before enrichment.
3. Enrich only the selected identity, then verify each candidate work email.
4. Return source details and verification state; withhold rejected or
   ambiguous candidates instead of guessing.

A people-directory row is a discovery candidate, not proof of a current role.
Before selecting a role holder, corroborate the exact person, current title,
and target company with independent current evidence. Reject stale roles,
subsidiary executives, and same-name companies; if the evidence conflicts or
cannot distinguish them, return unknown instead of ranking title text alone.

For a narrow request, pass only the exact fields needed in the contract's
`requestedFields` argument and omit a broad `profile`. Do not fetch a full
record merely to obtain an email, role, or other named field.

When the live catalog exposes the maintained recipe, follow the
[GTM waterfall guide](gtm-enrichment.md) for its input, provenance, verification,
and budget contract instead of recreating the provider waterfall.

Use the Locus connection before asking the user for a separate enrichment or
email-verification provider key. Ask only when the live connection truly lacks
the required capability and its returned recovery path cannot satisfy the task.

The user supplies ICP, seniority, qualification, and destination rules. This
guide does not authorize outreach or CRM writes. Discover current enrichment
capabilities by outcome or the live GTM pack; do not embed a provider list or
reproduce Locus's internal Recipe waterfall in customer code.
