# Locus plugin

[![skills.sh installs](https://skills.sh/b/locus-technologies/locus-pro-plugin)](https://skills.sh/locus-technologies/locus-pro-plugin)

Pay-per-use APIs for coding agents. This plugin connects the [Locus](https://paywithlocus.com)
MCP server and teaches your agent how to use it well: cited web research, paid
data and API lookups, and thousands of metered provider endpoints billed to one
prepaid workspace credit balance.

One repo, one plugin, many agents. The same plugin installs into Claude Code,
Codex, Cursor, Grok, OpenClaw, and any client that speaks the
[Agent Plugins](https://agent-plugins.org) or
[Agent Skills](https://agentskills.io) open standards.

## What you get

- **MCP server connection** to `https://api.paywithlocus.com/api/credits/mcp`
  (streamable HTTP). Sign-in is OAuth with browser consent; no keys are stored
  in configuration.
- **The `locus` skill**: operating instructions for the agent covering tool
  routing, cost quotes, idempotent billing, error recovery, and spend safety.
- **The `locus-setup` skill**: full self-serve onboarding — account creation
  (human sign-up through the OAuth page, or agent-owned accounts via
  AgentID), capability selection, and a user-requested Stripe funding
  handoff — so the whole product works from inside the plugin.

No account yet? The OAuth sign-in page includes account creation, and the
setup skill walks agents through the rest: [platform.paywithlocus.com](https://platform.paywithlocus.com).

## Install

### Claude Code

```
/plugin marketplace add locus-technologies/locus-pro-plugin
/plugin install locus@locus
```

Then run `/mcp`, select `locus`, and authenticate.

> Already added the server manually as `locus-pro` via `claude mcp add`? Remove
> it first (`claude mcp remove locus-pro`) so you don't carry two connections
> to the same server.

### Codex

```
codex plugin marketplace add locus-technologies/locus-pro-plugin
codex plugin add locus@locus
codex mcp login locus
```

### Cursor

Install from the Cursor Marketplace: open **Customize → Plugins**, search
for "Locus", and install — or type `/add-plugin locus` in chat. Cursor's
OAuth flow completes in the browser on first use.

Prefer to skip the plugin? Add the MCP server directly in
`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "locus": { "url": "https://api.paywithlocus.com/api/credits/mcp" }
  }
}
```

### Grok

```
grok plugin install locus-technologies/locus-pro-plugin --trust
```

Grok requires explicit trust to install plugins (they can run MCP servers
and skills); review the repo, then pass `--trust`. Grok discovers the
server's OAuth automatically and opens the browser flow on first use.

### OpenClaw

Install the plugin from this repo as a marketplace source, then add the MCP
server explicitly:

```
openclaw plugins install locus --marketplace locus-technologies/locus-pro-plugin
openclaw mcp add locus --url https://api.paywithlocus.com/api/credits/mcp --transport streamable-http --auth oauth
openclaw mcp login locus
```

A new marketplace source triggers a one-time trust prompt (pass `--force`
for non-interactive installs), and `openclaw gateway restart` applies
plugin changes.

### Skill only (77+ agents)

```
npx skills add locus-technologies/locus-pro-plugin
```

Discovers both Locus skills (usage and setup) and installs your selection
into whichever agents you have. The skills include the connection
instructions; add the MCP server in your client's settings to make the
tools available.

### Any Agent Plugins client

```
npx plugins add locus-technologies/locus-pro-plugin
```

### Plain MCP (no plugin)

```
claude mcp add --transport http locus https://api.paywithlocus.com/api/credits/mcp
codex mcp add locus --url https://api.paywithlocus.com/api/credits/mcp
```

## Data handling

The plugin's MCP configs send one static request header,
`X-Source-Name` (for example `cursor-plugin`), used only as anonymous
per-surface adoption telemetry. Tool calls carry whatever arguments the
agent sends to the Locus API, billed to the authenticated workspace; the
plugin itself stores nothing and never sees credentials or payment details.

## Authentication

The server advertises OAuth 2.1 with dynamic client registration. Your client
discovers it from the URL, opens a browser sign-in, and a consent screen in the
Locus dashboard scopes the connection. Tokens live in your client's runtime,
never in this repo's files. Never put `lcr_` or `lcac_` secret keys into MCP
configuration; those are server-side service credentials.

## Costs and safety

Paid provider calls are live and billed to your workspace credit balance;
catalog discovery, quotes, and balance checks are free. The skill instructs
agents to pass idempotency keys so retries never double-charge, to quote
significant calls with `estimate_cost` first, and to confirm with you before
unusually large spends. Spend limits and approvals are configured per workspace
in the [dashboard](https://platform.paywithlocus.com).

## Repository layout

| Path | Consumed by |
| --- | --- |
| `.claude-plugin/` | Claude Code (plugin + marketplace manifest) |
| `.codex-plugin/`, `.agents/plugins/` | Codex (plugin + marketplace manifest) |
| `.cursor-plugin/` | Cursor |
| `.grok-plugin/` | Grok |
| `plugin.json`, `mcp.json` | Agent Plugins (open standard) |
| `agents/<client>/` | Per-client MCP server config |
| `skills/` | The shared skills (Agent Skills standard): `locus` usage, `locus-setup` onboarding |

## Links

- Docs: https://docs.paywithlocus.com
- Dashboard: https://platform.paywithlocus.com
- MCP reference: https://paywithlocus.com/agent/mcp.md

## License

[MIT](./LICENSE)
