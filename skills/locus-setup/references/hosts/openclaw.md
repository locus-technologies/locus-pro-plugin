<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/hosts/openclaw.md, mirrored 2026-09-15 for the versioned Locus guide bundle. content-sha256: 8c0d95855d3ad29b368eb88bc916041c8b35151d9e21fb50a183aefe129a83ab -->

# OpenClaw adapter

Use this reference only after the shared host-adapter guide selects MCP for an
OpenClaw installation. Inspect `openclaw mcp --help` because command spelling
can change between releases.

Register one OAuth server named `locus` at the exact environment URL returned
by the compatibility record. Current releases accept this shape:

```bash
openclaw mcp set locus '{"url":"<MCP transport URL>","transport":"streamable-http","auth":"oauth","requestTimeoutMs":120000,"connectionTimeoutMs":15000}'
openclaw mcp login locus
```

Keep `openclaw mcp login locus` and its loopback listener alive until consent
finishes. If a managed agent shell cleans up child processes when a turn ends,
start the same login command in a foreground persistent terminal owned by the
host before presenting its authorization URL; do not replace native OAuth with
a hand-written flow. Paste a manual callback only into the waiting login
prompt, never into a command argument.

Install the three released skill trees through OpenClaw's native skill registry
when available. Its installer accepts a local skill directory, not an archive
URL: download each compatibility-index archive, verify its digest, extract it,
then run `openclaw skills install <extracted-skill-directory> --force` for each
of `locus`, `locus-setup`, and `locus-workflows`. Otherwise use the shared
persistent-filesystem tier beneath the selected profile's state directory. A
direct URL install of only the bootstrap `SKILL.md` is not complete skill
delivery.

Prefer an external vault injected into the Gateway process for a native
`lcac_` setup credential. When none exists, use the selected profile's trusted
global `.env`, never an agent workspace `.env`; keep the state directory mode
`0700` and the file mode `0600`. OAuth tokens remain in OpenClaw's native
connection store and never belong in that file or MCP configuration.

After authentication, reload or restart only when the installed version
requires it. The OpenClaw Gateway is not required for `openclaw mcp login`, a
direct MCP RPC, or fresh-session skill discovery; do not start it merely to
activate the installed skills. Verify a live MCP RPC and fresh-session skill
discovery. A short probe or runtime status snapshot can lag a healthy server,
active login, or subagent; retry with the configured timeout before
reauthenticating or terminating a healthy foreground process.
