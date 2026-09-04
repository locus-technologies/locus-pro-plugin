# Changelog

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
