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

Add the MCP server directly in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "locus": {
      "url": "https://api.paywithlocus.com/api/credits/mcp",
      "headers": { "X-Source-Name": "cursor-plugin" }
    }
  }
}
```

Cursor's OAuth flow completes in the browser on first use. Once the Locus
listing clears Cursor Marketplace review, you will also be able to install
it from **Customize → Plugins** (search "Locus") or with `/add-plugin locus`
in chat.

### Grok

```
grok plugin install locus-technologies/locus-pro-plugin --trust
```

Grok requires explicit trust to install plugins (they can run MCP servers
and skills); review the repo, then pass `--trust`. Grok discovers the
server's OAuth automatically and opens the browser flow on first use.

### OpenClaw

Install the plugin from this repo as a marketplace source; the bundle
already maps the MCP server, so no manual server configuration is needed:

```
openclaw plugins install locus --marketplace locus-technologies/locus-pro-plugin
openclaw gateway restart
openclaw mcp login locus
```

A new marketplace source triggers a one-time trust prompt (pass `--force`
for non-interactive installs), and the gateway restart applies plugin
changes.

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

The plugin-managed MCP configs send one static request header,
`X-Source-Name` (for example `cursor-plugin`). It identifies the
configuration format a host selected and may be used solely for anonymous
adoption telemetry; multi-format hosts can prefer a different bundled
definition than their own overlay — OpenClaw's bundle loader, for example,
honors the root `.mcp.json` and therefore reports `grok-plugin`. The header
is cosmetic: plain MCP clients that cannot configure static headers still
work without it.

The repository contains no credential values, and its MCP configurations
store none. Tool calls send the arguments the agent provides to
`https://api.paywithlocus.com` and are billed to the authenticated workspace.
If the user explicitly chooses the optional agent-owned setup path, the setup
skill also calls `https://api.agentmail.to` to create and verify an inbox and
register a public signing key, `https://api.auth.agentid.com` to submit a
signed approval, and `https://auth.agentid.com` to continue that
authorization transaction. AgentMail receives only the user-approved email
address and inbox name, the user-provided one-time code, and the public key;
AgentID receives the inbox identity and a one-time signed assertion. The
private signing key is generated locally and is never sent. Funding calls
`https://api.paywithlocus.com` and returns a server-provided Stripe Checkout
URL that the user opens in a browser; neither the plugin nor the agent
handles card details.

## Authentication and credentials

Human-owned MCP connections use OAuth 2.1 with dynamic client registration:
your client discovers it from the URL, opens a browser sign-in, and a consent
screen in the Locus dashboard scopes the connection. Access and refresh
tokens stay in the client's native OAuth store, never in this repo's files.

The optional agent-owned setup path may create an `AGENTMAIL_API_KEY`, a
locally generated P-256 signing key, and an `lcac_` value stored as
`LOCUS_AGENT_CREDENTIAL`. Keep them only in the runtime's approved secret
store; never put them in MCP configuration, chat, project files, source
control, logs, or command arguments. `LOCUS_SECRET_KEY` is referenced only as
a credential class to protect; the skills never read or set it, and neither
`lcr_` nor `lcac_` values belong in MCP configuration.

## Costs and safety

Paid provider calls are live and billed to your workspace credit balance;
catalog discovery, quotes, and balance checks are free. The skill instructs
agents to pass idempotency keys so a retry reusing its key never
double-charges, to quote
significant calls with `estimate_cost` first, and to confirm with you before
unusually large spends. Spend limits and approvals are configured per workspace
in the [dashboard](https://platform.paywithlocus.com).

## Repository layout

| Path | Consumed by |
| --- | --- |
| `.claude-plugin/` | Claude Code (plugin + marketplace manifest) |
| `.codex-plugin/`, `agents/codex/.mcp.json`, `.agents/plugins/` | Native Codex plugin, MCP configuration, and marketplace manifest |
| `.cursor-plugin/` | Cursor |
| `.mcp.json`, `skills/` | Effective Grok components while the root `plugin.json` is present (Grok prefers the root manifest) |
| `.grok-plugin/`, `agents/grok/` | Grok marketplace extraction and fallback configuration when no root manifest exists |
| `plugin.json`, `mcp.json` | Agent Plugins (open standard) |
| `agents/<client>/` | Per-client MCP server config |
| `skills/` | Shared Agent Skills-format instructions; `metadata.openclaw` is an intentional host extension for credential declarations |

## Links

- Docs: https://docs.paywithlocus.com
- Dashboard: https://platform.paywithlocus.com
- MCP reference: https://paywithlocus.com/agent/mcp.md

## License

[MIT](./LICENSE)
