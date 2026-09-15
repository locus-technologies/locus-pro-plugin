# Changelog

## 0.3.6 (2026-09-14)

- Released the corrected environment-aware remote-guide serving contract so
  stage URLs and immutable historical guide versions can be verified without
  changing the already published 0.3.5 artifacts.

## 0.3.5 (2026-09-14)

- Added a persistent-filesystem instruction tier between native skill
  registration and remote MCP guide retrieval.
- Required complete, digest-verified, versioned skill trees and honest
  fresh-session activation reporting for hosts without a native skill registry.
- Setup skill (v1.2.1) states the path rule: human-owned accounts are the
  default, the agent-owned path is only for headless runtimes or an explicit
  request and requires telling the user what such an account cannot do, an
  already-authenticated connection without an agent credential is
  human-owned, and a funding request never triggers agent-native signup.
  Usage skill (v1.1.2) and README send funding on human-owned accounts to
  the dashboard.

## 0.3.3 (2026-09-13)

- Corrected the hosted Workflow lifecycle so agents save a checked immutable
  version before starting a live pilot.
- Documented the exact compact `workflow_run` request and host-approval
  boundary, including the distinction from `workflow_runs` actions.
- Required live contract digests for saved bindings and clarified bounded
  remote-guide pagination.

## 0.3.1 (2026-09-13)

- Made hosted Workflows automatically eligible for live Locus-reviewed Tools,
  maintained Recipes, and explicitly verified external buyer-rail listings;
  exceptional approvals and emergency denies remain server-controlled.
- Clarified that catalog verification never bypasses connection scope, tool
  enablement, availability, contract validation, or run budgets.

## 0.3.0 (2026-09-11)

- Added provider-agnostic category and curated-pack discovery, including live
  group lookup, scoped pagination, and remote guide retrieval.
- Added the `locus-workflows` skill and a fixed-runtime TypeScript template for
  checked, fixture-tested, budget-bounded hosted Workflows with durable run
  inspection, cancellation, and resume guidance.
- Added one canonical versioned guide registry and generated JSON/Markdown
  bundle metadata so agents without persistent files can retrieve the same
  reviewed instructions served by native plugin packages.
- Extended manifest, release, and ChatGPT submission checks for the new guide
  and conditional hosted-Workflow tools.

## 0.2.1 (2026-09-04)

- Grok manifest precedence fixed: the root `.mcp.json` (the file Grok
  actually consumes while a root `plugin.json` exists) now uses Grok's
  `headers` dialect with its own attribution; the Codex-native definition
  moved to `agents/codex/.mcp.json` and the Codex manifest points there.
- README documents every network endpoint and credential the optional
  agent-owned setup path can touch, and the repository-layout table states
  the real per-host manifest resolution.
- The usage skill (v1.0.2) requires an estimate plus user confirmation
  before the first billed call a task did not explicitly authorize, and
  describes the tool surface scope-independently.

## 0.2.0 (2026-09-04)

- Skills aligned with production behavior (v1.0.1): capability-tool guidance,
  AgentMail inbox contract mirrored as a scoped reference, and updated
  connection steps.
- ChatGPT app submission bundle: all ten tools a full-scope OAuth session
  exposes, with server-declared annotations, review-facing justifications,
  and reproducible reviewer test cases; guarded by check-manifests.
- Codex manifest MCP definition moved to the native root `.mcp.json`;
  production smoke script and stronger CI validation.
- OpenClaw install simplified to the bundle's own server mapping.

## 0.1.0 (2026-09-02)

Initial release.

- Locus MCP server connection (streamable HTTP, OAuth 2.1 discovery) for
  Claude Code, Codex, Cursor, Grok, OpenClaw, and Agent Plugins clients.
- The `locus` skill: tool routing, cost quotes, idempotent billing, error
  recovery, and spend safety.
- The `locus-setup` skill: self-serve onboarding — account creation (human or
  agent-owned via AgentID), capability selection, and a user-requested Stripe
  funding handoff.
