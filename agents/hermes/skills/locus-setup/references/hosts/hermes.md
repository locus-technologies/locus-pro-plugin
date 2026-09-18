<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/hosts/hermes.md, mirrored 2026-09-17 for the versioned Locus guide bundle. content-sha256: 5732b42d8e70fb6b105984916696a8b1f3cc35f0e64cc64aed5ab4a7952458fb -->

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

Keep the versioned source and activation links inside the active Hermes
profile: use `<HERMES_HOME>/locus-agent-skills/<environment>/<version>/...`
and `<HERMES_HOME>/skills`. When `HERMES_HOME` is overridden, do not link that
profile to a shared `~/.locus` tree or another Hermes profile.

Register one OAuth server named `locus` at the exact environment URL returned
by the compatibility record. Write the native configuration before login so
an unauthenticated discovery probe cannot discard the server:

```bash
hermes config set mcp_servers.locus.url '<MCP transport URL>'
hermes config set mcp_servers.locus.auth oauth
hermes config set mcp_servers.locus.connect_timeout 30
hermes mcp login locus
```

Do not patch or reinstall Hermes when an interactive `hermes mcp add` probe
fails before OAuth. The declarative commands above register the same native
server without that probe; `hermes mcp login locus` then owns discovery and
authentication. Confirm the saved URL before login and do not preserve an
entry from another Locus environment.

Hermes performs OAuth discovery, PKCE, client identification, token exchange,
and refresh. Keep the login command alive through approval. From a one-shot
Hermes agent turn, launch it in the host's managed interactive PTY with
background, PTY, and completion notification enabled, then keep polling or let
the completion notification resume the same turn until the command exits. When
Hermes offers manual completion, paste the complete callback response
containing `code`, `state`, and `iss` into its waiting prompt; do not reduce it
to only the code or put it in command arguments. Use Hermes' documented DCR
fallback only when the installed release rejects Client ID Metadata Documents.

OAuth tokens belong in Hermes' owner-only MCP token store. For a native `lcac_`
setup credential, prefer an injected vault; otherwise use
the active Hermes data directory's `.env`, never a project or workspace
`.env`, with the directory mode `0700` and file mode `0600`. Do not add the
credential to the MCP entry.

The login process normally exits after saving credentials, so process absence
is not authentication failure. After it exits or a host turn times out, confirm
the active profile has a native token record without reading or printing it,
reload MCP, and prove authentication with a live free Locus call before
starting OAuth again. `hermes mcp list` labels such as `enabled` or `Tools: all`
describe configuration and filtering, not authenticated reachability.

Reload MCP if the authenticated server is not immediately visible, then verify
the live tool list, a free readiness call, and automatic skill discovery in a
fresh Hermes session. Do not infer readiness from configuration text alone.
