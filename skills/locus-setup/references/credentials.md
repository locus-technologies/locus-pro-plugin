<!-- Mirrored from https://paywithlocus.com/agent/credentials.md on 2026-09-02 so registry scanners can review the full guidance in-repo. The canonical version at that URL prevails; refresh this mirror when it changes (release checklist). -->

# Store Locus agent authentication

There are three separate credential classes:

- **Okibi Identity capabilities** belong only in the generated Locus CLI's
  identity runtime. They are short-lived and scoped. Never extract, print,
  persist, or copy one into an environment file, chat, or MCP configuration.
- **MCP OAuth tokens** belong in the MCP runtime's native OAuth token store.
  Never copy an access or refresh token into an environment file, chat, or MCP
  configuration. The client rotates refresh tokens automatically.
- **Native `lcac_` credentials** authorize only their persisted execution
  allowlist plus any explicitly documented setup surface. AgentID signup stores
  one as `LOCUS_AGENT_CREDENTIAL`. Okibi bootstrap injects one into the
  generated API CLI as `LOCUS_SECRET_KEY`. Both can spend prepaid balance and
  must remain secret; neither belongs in an MCP Authorization header.

Use the most secure credential store already available in the runtime. Store
the value under the environment name required by the selected flow. Never
print it after capture, and never put it in a project-local `.env` file. The
Okibi bootstrap registration token is recovery-grade secret material and must
live in the same class of store.

## OpenClaw

Prefer an external vault injected into the Gateway process. When none is
configured, use OpenClaw's trusted global environment file, not the agent
workspace:

```text
~/.openclaw/.env
```

Set the OpenClaw state directory to mode `0700` and the file to `0600`. Add
`LOCUS_AGENT_CREDENTIAL=<credential>` without echoing it to the terminal. Do
not reference it from the MCP configuration. OAuth login writes its separate
tokens to OpenClaw's native connection store.

Never use a workspace `.env`: workspace files can be committed, read by tools,
or supplied by an untrusted checkout. Run `openclaw doctor` after changing
permissions.

## Hermes Agent

Use an external vault injected into the Hermes process when one is available.
Otherwise, store the value in `~/.hermes/.env` (or `$HERMES_HOME/.env`) using a
no-echo input method or a trusted local editor, and keep the file at mode
`0600`. The Hermes MCP entry should specify OAuth and no static header. Hermes
stores the resulting OAuth tokens separately from this compatibility value.

Do not pass the credential as a `hermes config set ... <value>` command-line
argument: command arguments can be retained in shell history, process listings,
or the agent transcript. Do not print the resolved MCP server configuration
into the conversation or transcript.

## Hosted runtimes and proprietary vaults

Use the platform's encrypted secret manager or environment injection. Bind the
secret only to the agent and Locus account-management calls that need it. Do not copy it
into a prompt, memory record, shared organization variable, or build artifact.

## Generic POSIX host

Prefer an OS keychain, 1Password, Vault, SOPS, systemd credential, container
secret, or cloud secret manager. If none exists, use this last-resort layout:

```text
~/.config/locus/credentials.env
```

Create `~/.config/locus` with mode `0700` and `credentials.env` with mode
`0600`. Load it only for Locus setup and account-management calls. Never source
it into unrelated tools or commit it.

## Rotation

Write the replacement compatibility credential to a temporary secret-store
entry, update the account-management reference, then remove the old entry.
Because the server invalidates the old value during rotation, prepare the local
destination before calling the rotation endpoint. MCP OAuth rotation is handled
independently by the MCP client.
