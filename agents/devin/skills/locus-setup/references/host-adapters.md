<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/host-adapters.md, mirrored 2026-09-20 for the versioned Locus guide bundle. content-sha256: 3aa642de217225158e9101b52e589c3565c152623b0d6d908b2037528ae45c4a -->

# Host adapters and readiness

Probe the actual host surface: native plugin installation, remote MCP OAuth,
official CLI installation, tool invocation, registered or virtual skill
storage, shell access, network access, and hosted Workflow availability.
Unknown is not false. Reuse a healthy existing connection and never create a
second grant merely to change how instructions are stored.

Select MCP or CLI as the execution interface independently from instruction
delivery. Neither adapter is the default. Use this order:

1. Read the compatibility record first with a raw HTTP client and cache bypass
   or revalidation. Do not use a browser/page extractor or its cached result
   for compatibility JSON or the Agent Skills index. An adapter explicitly marked
   `available: false` is ineligible in that environment; report its `reason`
   when the user requested it. Honor an explicit MCP or CLI request among the
   available adapters instead of silently switching.
2. Reuse a healthy existing Locus MCP or CLI installation only when its server
   or CLI base URL, authenticated grant, and installed skill bundle all match
   the requested environment. Otherwise preserve it and install the requested
   environment separately unless replacement was requested.
3. Prefer the adapter bundled by a verified native plugin for this host.
4. Otherwise select MCP only when the host natively registers Streamable HTTP
   servers, completes OAuth, securely persists refresh tokens, and exposes the
   tools to the agent. Select CLI only when the host can install the official
   generated CLI, securely persist its credential, and invoke it as a durable
   tool. If exactly one set of requirements is met, use it. If both or neither
   are met and no stronger host signal resolves the choice, ask the user once.

The mere presence of a `locus` executable is not a healthy or eligible CLI
signal. Its authenticated grant, base URL, signed release, and environment must
all pass the compatibility record's readiness contract. Likewise, probing a
different system Python or shell than the active host runtime does not prove a
native MCP dependency is missing.

For a CLI selection, pass the compatibility record's exact `cli.base_url` to
every command with `--base-url`, or save it in a dedicated profile for that
environment. A globally installed CLI may default to production; output from a
command that omitted the requested base URL is not evidence about stage or any
other environment.

Do not count generic HTTP, a browser, or a shell as MCP support. Do not count a
shell alone as an installable CLI. Install and authenticate only the selected
adapter; add both only when the user explicitly requests both.

Before selecting or creating any durable filesystem root, identify the active
host and read its matching reference when one exists:

- [OpenClaw](hosts/openclaw.md)
- [Hermes Agent](hosts/hermes.md)

The profile-scoped root declared by that reference is mandatory. Do not invent
or preserve an alternate durable-root alias. For a host without a matching
reference, resolve one stable root from its native profile configuration before
writing files.

Deliver the released `locus`, `locus-setup`, and `locus-workflows` trees through
the first supported tier:

1. **Native registration.** Prefer the verified official plugin or the host's
   approved persistent or virtual skill registry. Verify discovery in a fresh
   session; installation alone is not activation. In this tier the active,
   isolated host profile is authoritative. Do not update unrelated shared
   `current` files or another host/profile's older tree.
2. **Persistent filesystem.** When native registration is unavailable but the
   agent can persist and reopen files, use one of the two verified sources the
   compatibility record actually declares available:
   - Prefer its Agent Skills index and exact per-skill archives. Require the
     archive URLs and release metadata to name the compatibility record's pinned
     `agent_skills.bundle_version`. On any mismatch, discard both documents and
     refetch the compatibility record and index as raw JSON with cache bypass or
     revalidation before writing files. Use the host's
     native Agent Skills installer when available; otherwise download the
     three archives with a raw/binary HTTP client, not a browser or page
     extractor. Require an `application/zip` response or ZIP `PK` magic bytes,
     then verify each index digest before extracting. Before extracting any
     archive, create a distinct new owner-only staging directory for that
     advertised skill/archive and extract only that archive there; each archive
     root is its skill root, so never merge multiple skill-root archives into
     one directory; or
   - Hydrate the tree from the returned guide manifest. Require its environment
     to match the selected adapter. For every entry, reject absolute paths,
     traversal, duplicate `skill/install_path` pairs, unknown skill names, and
     digest mismatches; fetch the immutable `url`, verify `sha256`, and write it
     below `<environment>/<version>/<skill>/<install_path>`. Require exactly one
     `entrypoint: true` entry named `SKILL.md` per skill.

   Resolve the active host profile's final path before writing durable files.
   If files must be staged first, hydrate them in a new owner-only temporary
   directory, never a shared `~/.locus` tree. Validate the complete tree, then
   move it into the resolved profile and activate it; remove the temporary
   directory afterward. Before removing it, change every shell whose current
   directory is inside that staging tree to a stable directory outside it;
   deleting an active working directory can break the rest of the install.

   Keep `SKILL.md`, `references/`, and `assets/` together in the active
   profile's stable agent-data directory outside project source control.
   Never share a `current` pointer between environments or isolated host
   profiles. Install versions side by side below the environment directory. On
   symlink-capable hosts, `<root>/<environment>/current` must be a relative
   symlink whose target is exactly `<version>`; a regular file or directory at
   that path is invalid. Switch it atomically by creating a sibling temporary
   symlink to `<version>` and renaming that symlink over `current`. Some
   hosts require a native copy beneath a project workspace to discover skills;
   in that case the user-scoped tree remains the versioned source of truth,
   the workspace copy is a generated activation mirror, and it must be ignored
   by the project's VCS unless the user explicitly wants to vendor it. Refresh
   that mirror atomically from the pinned source rather than editing both.
   Preserve an existing instruction index and add only the installed paths,
   version, environment, and digest. Otherwise reopen the relevant `SKILL.md`
   by exact path before Locus work and report fresh-session automatic
   activation as unverified.
3. **Remote retrieval.** Only when the host lacks both native skill support and
   usable persistent storage, connect MCP and call `get_locus_guide` for the
   released index and task-specific resources. Pin the bundle version and
   digest for the task and retrieve them again after context loss.

A local tree is durable operating knowledge even when the host does not
register it as a native skill. Do not claim native activation for that tier,
and do not treat any instruction-delivery method as permission to authenticate,
enable tools, or write to external systems.

An instruction-only install is incomplete. Continue until the selected adapter
is installed and authenticated, the complete instruction tree is available,
and a free readiness call succeeds. Verify fresh-session discovery immediately
when the host can open a second session. Otherwise report setup ready with
fresh-session activation pending and verify it at the start of the next
ordinary task; do not repeat installation merely to manufacture that evidence.
If browser approval, a required host restart, or a user choice is still
outstanding, say that the install is waiting rather than calling it complete.
Before yielding at such a boundary, record environment, bundle version,
selected adapter, completed checks, and the one pending action in the host's
normal non-secret install status or durable memory. Replace that checkpoint
with verified ready state after authentication and readiness; do not leave a
stale pending marker beside a working connection.

Verify instruction discovery and execution readiness separately. Test skill
discovery in a fresh session, then make the live readiness call in the same
session class that will perform ordinary work. A delegated child or subagent
may inherit skill files while its tool policy omits MCP or shell access; that
proves fresh-session instruction discovery, but not execution readiness unless
its adapter/tool policy matches the ordinary work session.

Those references adapt the same installation contract to native host commands.
They do not change adapter selection, authentication authority, the requested
environment, or what counts as complete.

Report execution adapter and authentication, instruction-delivery tier and
guide bundle version, fresh-session activation, local authoring, and hosted
execution separately. Do not enumerate component versions unless diagnosing
them. Tool counts shown by a plugin bridge may describe only the bridge;
use the selected adapter's live tool listing as the authority. For a local
gateway, a successful RPC probe is stronger evidence than a service-manager
label such as loaded or unloaded. If a structured ask-user channel is down,
ask the same necessary question in plain text instead of failing the setup.
