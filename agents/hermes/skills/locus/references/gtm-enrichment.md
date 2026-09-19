<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus/references/gtm-enrichment.md, mirrored 2026-09-19 for the versioned Locus guide bundle. content-sha256: a1cc18fb31abcf45b4efc7ae1b15e5f5cb15de72fdb28aabc13468d1b81d530f -->

# GTM waterfall enrichment

Use the `gtm-enrich-record` recipe when the task is to turn one known person or
company identifier into a fuller GTM record. The executable slug is
`locus-gtm/enrich`.

## Input

Supply `entity.kind` as `person` or `company`, plus the strongest identifiers
you know. Supported person seeds are email, LinkedIn URL, provider ID, or a
name paired with a company name/domain/profile. A phone number is not a
supported sole enrichment seed because the recipe has no reliable reverse-phone
identity resolver. Supported company seeds are a domain, name, LinkedIn URL,
or provider ID.

When a discovery result supplies a stable provider person ID, send it as
`entity.identifiers.personId`. Prefer that exact seed over an obfuscated name
or first name, and do not call a second provider-specific enrichment endpoint
merely to turn the ID into a display name.

Choose a named `profile` for a broad common case. For an exact or narrow data
contract, omit `profile` and set `requestedFields` to only the fields the task
will use; they are the waterfall's stop condition.
`contactVerification` defaults to `required`. Set it to `none` only when the
downstream task explicitly accepts unverified provider candidates.

## Execution rules

1. Call `describe` for `locus-gtm/enrich` when its schema is not already known.
2. Include `maxCredits`, the aggregate provider-and-verification ceiling
   required by direct and hosted Workflow execution. In a Workflow, pass the
   same value as the row call's `maxChargeCredits` unless an intentionally
   tighter outer cap is appropriate.
3. Call `execute` once with a stable idempotency key for the logical record.
4. Let the recipe choose providers. Do not reproduce the waterfall manually.
5. Report the normalized fields, each field's provider provenance,
   `contactVerification.verifications`, and `missingFields`. Do not present
   rejected identity-conflict or contact-verification responses as facts.

The routing policy is seed-specific. The first provider is selected by correct
whole-record completeness in the current benchmark. Later providers are
selected by the fields they add to records still incomplete. A narrow resolver
such as an email-only endpoint therefore belongs later in a name or email
waterfall, even if it has an excellent email hit rate.

## Provider legs and cost control

The waterfall is strictly sequential. Each leg runs only when all of these hold:

- at least one requested field is still missing and the leg can produce it;
- the leg accepts an identifier the run already holds (an exact key such as
  email, LinkedIn URL, or domain, or a name paired with a company);
- the run has already confirmed the person's identity, for the two email
  finders that require it (Hunter Email Finder, Findymail name search);
- the remaining budget covers the leg's full estimated charge and, for a
  contact-only leg, at least one required verifier.

A leg that fails a gate is reported in `attempts` with status `skipped`, costs
nothing, and names the gate in `errorCode`:

| `errorCode` | Meaning |
| --- | --- |
| `no_missing_fields` | Every field this leg produces is already filled. |
| `seed_unsupported` | The leg accepts no identifier the run holds yet. |
| `identity_unconfirmed` | The leg needs a confirmed identity and no earlier leg has produced one. |
| `budget_exceeded` | The leg's estimate would push the run past `maxCredits`. |

A skipped leg is not a miss. A leg that dispatched and found nothing reports
status `no_result`. The run stops as soon as every requested field is filled,
so the requested output contract directly controls when the record is complete.

Each seed has one versioned order. Legs measured for that seed keep their
benchmark rank; the contiguous unmeasured catalog tail is sorted by its live
resolved price, with the policy order only breaking ties. This means there is
not a fixed "native tier, then catalog tier" rule: a measured catalog adapter
can lead or appear between native adapters. For example, the current email
order starts Hunter Combined, Prospeo Person, Icypeas Reverse Email, Clado,
Diffbot Knowledge Graph, then Apollo Person. Diffbot Knowledge Graph leads the
LinkedIn seed, Apollo Person leads name+company, and Hunter Company leads the
company seed. Read the planned `attempts`/policy metadata for the exact active
order instead of reconstructing it from this guide.

Catalog legs include Icypeas profile lookup and profile/company scrape, Aviato,
Diffbot Knowledge Graph, Sumble, Findymail, People Data Labs, and ContactOut.
There is no RocketReach adapter in the built-in waterfall. Catalog legs on the
x402 or MPP rails settle with the seller before Locus sees the payload, so a
miss on those legs is charged. The `estimate` and `execute` responses show each
leg's `rail` (`api-key`, `x402`, `mpp`) so an agent can see which charges are
final.

## Contact verification

With the default `contactVerification: "required"`, a discovered email or
phone is only merged into the record after its verification waterfall passes.
A rejected candidate remains missing, so the next enrichment provider can try
another candidate. The response records every check, outcome, evidence flags,
receipt ID, and charge in `contactVerification.verifications`.

Email candidates run through ZeroBounce first. `valid` is accepted;
`invalid`, `spamtrap`, `abuse`, and `do_not_mail` are rejected. Catch-all and
unknown results are inconclusive and fall through to Fiber, which requires an
`ok`, non-disposable, non-catch-all result with an acceptable deliverability
score. Phone candidates use Fiber and require a valid, reachable line. When a
person name and caller-ID name are both available, an ownership mismatch
rejects the number; missing caller-ID evidence is reported as `unknown` and is
not fabricated into a match. Company-phone ownership is not inferred from
caller ID.

Verification calls are ordinary billed child calls under the same parent run,
idempotency contract, and `maxCredits` ceiling. `estimate` includes the
conservative maximum verifier spend. A definitive rejection stops that
candidate's verification chain; an inconclusive or unavailable verifier falls
through. If no required verifier is available, planning fails before any
enrichment provider is charged. Caller-supplied seed contact values retain
`Caller input` provenance and are not represented as newly verified output.
Terminal responses also report `billing.reservedCredits: "0"`, plus separate
provider and verification-call attempt/success counters; pending runs do
not claim that upstream child authorization has been released.

Identity checks apply to every leg. A response that contradicts a seed
identifier is rejected as `identity_conflict`. Exact-key lookups (reverse
email, LinkedIn scrape, PDL by email) count the key they were queried with as
confirmed, so a hit that omits the seed email is still accepted when nothing
else conflicts. Company-only vendors never write person identifiers.

`maxCredits` is a ceiling for the whole run, including contact verification.
Planning rejects the request when no eligible leg plus its minimum required
verification can fit. During execution, any leg or verifier whose estimate
would push spend past the ceiling is skipped as `budget_exceeded`, and the run
continues with cheaper legs that still fit.

Metered natives are requested at their minimum: Diffbot Enhance is capped to one
entity, and Sumble contact reveals (email, phone) are selected only when the
caller asked for those fields.

## Capability pack

Agent-owned accounts enable the versioned pack at
`PUT /api/credits/agent/capability-packs/gtm-enrichment` with
`{"enabled":true}`. Workspace managers can use
`PUT /api/credits/capability-packs/gtm-enrichment`.
This atomically enables the recipe and its current provider basket. Disabling
the pack closes the recipe parent but intentionally retains its member provider
endpoints, because they may be shared by another pack or direct workflow.

The built-in order is based on benchmark
`public-professional-directory-2026-09-08-v1`: 30 verified public professional
records, six for each of work email, office phone, LinkedIn URL,
name+company, and company seeds. Hunter Combined currently leads email on
cost-adjusted marginal completeness, Diffbot Knowledge Graph leads LinkedIn,
Apollo Person leads name+company, and Hunter Company leads company. The phone
cohort confirmed that no reliable direct phone-seed resolver exists, so
phone-only requests now fail before spending rather than advertising a route
that matched none of six cases. Some name+company tail results were also
excluded because company-shaped responses could not confirm the person
identity.

Re-run a permissioned 30-record benchmark before replacing this policy for a
different market. The runner prints a `policy` object; deploy that reviewed
object as `GTM_ENRICHMENT_ROUTING_POLICY_JSON`. Unmeasured adapters remain at
the end of each order so newly discovered identifiers can still unlock them.
The catalog legs added on 2026-09-08 are unmeasured and keep their price order
until a benchmark ranks them.

## BYOK and custom providers

Enterprise Custom APIs are BYOK: the tenant owns the provider credential and
the encrypted `custom-*` endpoint contract, and the secret remains outside
Workflow source and provider output. Custom endpoints are not silently added
to the built-in `locus-gtm/enrich` recipe. They can be used directly, or as a
hosted Workflow binding when the exact custom slug is enabled for the tenant
and connection and is also present in the platform Workflow binding allowlist.
Use discovery to confirm that eligibility; never copy the provider key into a
Workflow to work around a missing approval.

For a repeatable batch, adapt the
[reviewed GTM Workflow asset](../../locus-workflows/assets/gtm-enrichment/README.md)
instead of rebuilding its batching and fixture scaffolding.
