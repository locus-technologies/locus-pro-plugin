# Locus plugin

Pay-per-use APIs for coding agents. This plugin connects the [Locus](https://paywithlocus.com)
MCP server and teaches your agent how to use it well: cited web research, paid
data and API lookups, and thousands of metered provider endpoints billed to one
prepaid workspace credit balance.

One repo, one plugin, many agents. The same plugin installs into Claude Code,
Codex, Cursor, OpenClaw, and any client that speaks the
[Agent Plugins](https://agent-plugins.org) or
[Agent Skills](https://agentskills.io) open standards.

## What you get

- **MCP server connection** to `https://api.paywithlocus.com/api/credits/mcp`
  (streamable HTTP). Sign-in is OAuth with browser consent; no keys are stored
  in configuration.
- **The `locus` skill**: operating instructions for the agent covering tool
  routing, cost quotes, idempotent billing, error recovery, and spend safety.

You need a Locus workspace with credits: [platform.paywithlocus.com](https://platform.paywithlocus.com).

## Install

### Claude Code

```
/plugin marketplace add locus-technologies/locus-plugin
/plugin install locus@locus
```

Then run `/mcp`, select `locus`, and authenticate.

> Already added the server manually as `locus-pro` via `claude mcp add`? Remove
> it first (`claude mcp remove locus-pro`) so you don't carry two connections
> to the same server.

### Codex

```
codex plugin marketplace add locus-technologies/locus-plugin
codex plugin add locus@locus
codex mcp login locus
```

### Cursor

Cursor Marketplace listing is in review. Until then, add the MCP server
directly in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "locus": { "url": "https://api.paywithlocus.com/api/credits/mcp" }
  }
}
```

Cursor's OAuth flow completes in the browser on first use.

### OpenClaw

OpenClaw installs this repo as a plugin bundle:

```
openclaw plugins install https://github.com/locus-technologies/locus-plugin
```

The MCP server merges into your OpenClaw settings; run `openclaw mcp login locus`
to authenticate.

### Skill only (77+ agents)

```
npx skills add locus-technologies/locus-plugin
```

Installs the `locus` skill into whichever agents you have. The skill includes
the connection instructions; add the MCP server in your client's settings to
make the tools available.

### Any Agent Plugins client

```
npx plugins add locus-technologies/locus-plugin
```

### Plain MCP (no plugin)

```
claude mcp add --transport http locus https://api.paywithlocus.com/api/credits/mcp
codex mcp add locus --url https://api.paywithlocus.com/api/credits/mcp
```

## Authentication

The server advertises OAuth 2.1 with dynamic client registration. Your client
discovers it from the URL, opens a browser sign-in, and a consent screen in the
Locus dashboard scopes the connection. Tokens live in your client's runtime,
never in this repo's files. Never put `lcr_` or `lcac_` secret keys into MCP
configuration; those are server-side service credentials.

## Costs and safety

Calls are live and billed to your workspace credit balance. The skill instructs
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
| `plugin.json`, `mcp.json` | Agent Plugins (open standard) |
| `agents/<client>/` | Per-client MCP server config |
| `skills/locus/` | The shared skill (Agent Skills standard) |

## Links

- Docs: https://docs.paywithlocus.com
- Dashboard: https://platform.paywithlocus.com
- MCP reference: https://paywithlocus.com/agent/mcp.md

## License

[MIT](./LICENSE)
