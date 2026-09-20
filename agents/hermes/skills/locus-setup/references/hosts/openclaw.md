<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/hosts/openclaw.md, mirrored 2026-09-20 for the versioned Locus guide bundle. content-sha256: 8f18bd6d9ddbb401d1d994fb9e1f7374a431a05e42d32a7a20ce8b0dad51c4d6 -->

# OpenClaw adapter

Use this reference only after the shared host-adapter guide selects MCP for an
OpenClaw installation. Inspect `openclaw mcp --help` because command spelling
can change between releases.

Register one OAuth server named `locus` at the exact environment URL returned
by the compatibility record. Before presenting an authorization URL, run the
login in a persistent terminal and prove its loopback listener will survive
the agent turn. Current releases accept this shape:

```bash
openclaw --profile "<selected-profile>" mcp set locus '{"url":"<MCP transport URL>","transport":"streamable-http","auth":"oauth","requestTimeoutMs":120000,"connectionTimeoutMs":15000}'
openclaw --profile "<selected-profile>" mcp login locus
```

Keep that profile-scoped login command and its loopback listener alive until
consent finishes. If a managed agent shell cleans up child processes when a
turn ends, start the same native login command in a foreground persistent
terminal owned by the host before presenting its authorization URL. Do not
return a final response while the only listener belongs to a per-turn child
process. If the host has no such terminal but does have Python, detach only
that native command with
`subprocess.Popen(..., start_new_session=True)`, redirect its output to an
owner-only temporary log, and verify that both the process and listener remain
alive before opening the URL. This is process supervision, not a replacement
OAuth flow.

Do not assume OpenClaw has an interactive callback-paste prompt: current
releases use the loopback listener. Keep it alive so the browser can return
directly. Never use a recovery option that places the authorization code,
token, or full callback URL in a command argument. If the login command exits
or the host reports a timeout, run the live probe below before restarting
OAuth: successful credential persistence can outlive the waiting process.
Start a fresh login only when the probe reports unauthenticated/no credential
or the original process reports an explicit OAuth failure.

If approval will open on a different machine, forward the printed callback
port before opening the authorization URL. From the browser machine, keep this
tunnel alive alongside the remote login process:

```bash
ssh -N -L <callback-port>:127.0.0.1:<callback-port> <openclaw-host>
```

The browser's loopback redirect then reaches OpenClaw's remote listener. If no
secure port-forwarding path or browser on the OpenClaw host is available, stop
and report that current OpenClaw cannot complete this OAuth flow remotely; do
not present copy-back parameters it cannot consume.

Run every native OpenClaw command with the same selected profile, including
configuration lookup, MCP setup/login/probe/reload, and skill installation.
For a named profile, keep `--profile <selected-profile>` on every command; omit
it only when the selected profile is explicitly the default. Resolve the state
directory before choosing any staging, extraction, or durable path:

```bash
openclaw_config_path="$(openclaw --profile "<selected-profile>" config file)"
openclaw_state_dir="$(dirname "$openclaw_config_path")"
case "$openclaw_state_dir" in
  /*) ;;
  *) echo "OpenClaw profile state directory is not absolute" >&2; exit 1 ;;
esac
```

For the explicit default profile, run the same commands without `--profile`.
Do not infer the state directory from the user's `.openclaw` directory,
`paths.state`, the project workspace, or a process default; stop if
`openclaw config file` does not return an absolute profile configuration path.

Make that resolved state directory the durable source before native
registration. Download, extract, and verify the three compatibility-index
archives in an owner-only staging directory beneath it, then move the complete
released trees beneath
`<openclaw-profile-state-directory>/locus-agent-skills/<environment>/<version>/`
and atomically update that environment's `current` pointer. Preserve an
instruction index there with the release/digest/path metadata and no
credentials. Never register from `/tmp`, a shared `~/.locus-agent` tree, an
extraction directory, or a project workspace: native metadata and provenance
must resolve to the selected profile's durable tree after cleanup.

OpenClaw's installer accepts a local skill directory, not an archive URL. Run
`openclaw --profile "<selected-profile>" skills install
<absolute-durable-skill-directory> --force` for each of `locus`, `locus-setup`,
and `locus-workflows`; current releases can parse a relative path as a registry
slug. If this release creates a workspace copy, treat it as a generated
activation mirror of the versioned profile tree and do not make it the only
installed artifact. A direct URL install of only the bootstrap `SKILL.md` is
not complete skill delivery.

Prefer an external vault injected into the Gateway process for a native
`lcac_` setup credential. When none exists, use the selected profile's trusted
global `.env`, never an agent workspace `.env`; keep the state directory mode
`0700` and the file mode `0600`. OAuth tokens remain in OpenClaw's native
connection store and never belong in that file or MCP configuration.

After authentication, reload or restart only when the installed version
requires it. The OpenClaw Gateway is not required for `openclaw mcp login`, a
direct MCP RPC, or fresh-session skill discovery; do not start it merely to
activate the installed skills, and do not create an automation watcher unless
the Gateway is already authenticated for an independently requested use.

When supported by the installed release, use `openclaw mcp status --verbose`
for static configuration, `openclaw mcp probe locus --json` for live transport
and authentication, and `openclaw mcp reload` without a server argument after
configuration changes, always with the same `--profile` selection. Verify
required skill and tool names rather than a numeric tool count, because
bridge-synthesized resource/prompt tools can change that count. Then start a
fresh agent session with that profile and verify skill discovery plus a live
free Locus call. A short probe or runtime status snapshot can lag a healthy
server, active login, or subagent; retry with the configured timeout before
reauthenticating or terminating a healthy foreground process.
