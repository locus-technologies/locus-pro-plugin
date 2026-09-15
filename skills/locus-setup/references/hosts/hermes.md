<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/hosts/hermes.md, mirrored 2026-09-15 for the versioned Locus guide bundle. content-sha256: 324533200b9f7e1088009c15f5e36b499ebfb160104c51dde56778c43aef97a3 -->

# Hermes Agent adapter

Use this reference only after the shared host-adapter guide selects MCP for a
Hermes Agent installation. Resolve the active Hermes data directory from the
host configuration; its default location is `~/.hermes`.

Hermes can install a remote `SKILL.md`, but a direct URL is a single-file skill
install. Treat it as bootstrap delivery only. Complete the installation with
the compatibility record's digest-pinned Agent Skills archives or guide
manifest so `locus`, `locus-setup`, and `locus-workflows` each retain their
linked references and assets. Use a fresh session or Hermes' documented
prompt-cache invalidation after installing the complete trees.

Register one OAuth server named `locus` at the exact environment URL returned
by the compatibility record:

```bash
hermes mcp add --url '<MCP transport URL>' --auth oauth locus
hermes mcp login locus
```

Hermes performs OAuth discovery, PKCE, client identification, token exchange,
and refresh. Keep the login command alive through approval. When Hermes offers
manual completion, paste the complete callback response containing `code`,
`state`, and `iss` into its waiting prompt; do not reduce it to only the code
or put it in command arguments. Use Hermes' documented DCR fallback only when
the installed release rejects Client ID Metadata Documents.

OAuth tokens belong in Hermes' owner-only MCP token store. For a native `lcac_`
setup credential, prefer an injected vault; otherwise use
the active Hermes data directory's `.env`, never a project or workspace
`.env`, with the directory mode `0700` and file mode `0600`. Do not add the
credential to the MCP entry.

Reload MCP if the authenticated server is not immediately visible, then verify
the live tool list, a free readiness call, and automatic skill discovery in a
fresh Hermes session. Do not infer readiness from configuration text alone.
