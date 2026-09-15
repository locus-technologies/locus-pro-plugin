<!-- Scoped excerpt of https://paywithlocus.com/agent/credentials.md, mirrored 2026-09-15 so registry scanners can review the exact contract this skill uses in-repo. Runtime-specific guidance lives in optional host references. This committed snapshot is authoritative for this release; refresh deliberately and update the digest below. content-sha256: 1010b086bdb55851769bf5180994e5dfb1b854ebe418201fde7ae51fd398cc8b -->

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

The generated CLI does not silently fall back to a secret file. When no OS
keychain is available, file storage is an explicit owner choice: pass
`--allow-file-storage` to `locus auth login`, or set
`OKIBI_AUTH_ALLOW_FILE_STORAGE=1`. `OKIBI_AUTH_STORAGE` selects the supported
storage backend. Keep any selected file in the owner-only location above; do
not invent a project-local fallback.

## Rotation

Write the replacement compatibility credential to a temporary secret-store
entry, update the account-management reference, then remove the old entry.
Because the server invalidates the old value during rotation, prepare the local
destination before calling the rotation endpoint. MCP OAuth rotation is handled
independently by the MCP client.
