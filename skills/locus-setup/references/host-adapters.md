<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/host-adapters.md, mirrored 2026-09-14 for the versioned Locus guide bundle. content-sha256: 629f391cf91e5990138493f3232a0caadf4812a149fb474141e32e670d6d1409 -->

# Host adapters and readiness

Probe the actual host surface: native plugin installation, remote MCP OAuth,
official CLI installation, tool invocation, registered or virtual skill
storage, shell access, network access, and hosted Workflow availability.
Unknown is not false. Reuse a healthy existing connection and never create a
second grant merely to change how instructions are stored.

Select MCP or CLI as the execution interface independently from instruction
delivery. Neither adapter is the default. Use this order:

1. Honor an explicit MCP or CLI request. If it is unavailable, report the exact
   blocker instead of silently switching adapters.
2. Reuse a healthy existing Locus MCP or CLI installation unless replacement
   was requested.
3. Prefer the adapter bundled by a verified native plugin for this host.
4. Otherwise select MCP only when the host natively registers Streamable HTTP
   servers, completes OAuth, securely persists refresh tokens, and exposes the
   tools to the agent. Select CLI only when the host can install the official
   generated CLI, securely persist its credential, and invoke it as a durable
   tool. If exactly one set of requirements is met, use it. If both or neither
   are met and no stronger host signal resolves the choice, ask the user once.

Do not count generic HTTP, a browser, or a shell as MCP support. Do not count a
shell alone as an installable CLI. Install and authenticate only the selected
adapter; add both only when the user explicitly requests both.

Deliver the released `locus`, `locus-setup`, and `locus-workflows` trees through
the first supported tier:

1. **Native registration.** Prefer the verified official plugin or the host's
   approved persistent or virtual skill registry. Verify discovery in a fresh
   session; installation alone is not activation.
2. **Persistent filesystem.** When native registration is unavailable but the
   agent can persist and reopen files, use one of the two verified sources the
   compatibility record actually declares available:
   - Prefer its Agent Skills index and exact per-skill archives. Use the host's
     native Agent Skills installer when available; otherwise download the
     three archives, verify their index digests, and extract them; or
   - Hydrate the tree from the returned guide manifest. Require its environment
     to match the selected adapter. For every entry, reject absolute paths,
     traversal, duplicate `skill/install_path` pairs, unknown skill names, and
     digest mismatches; fetch the immutable `url`, verify `sha256`, and write it
     below `<version>/<skill>/<install_path>`. Require exactly one
     `entrypoint: true` entry named `SKILL.md` per skill.

   Keep `SKILL.md`, `references/`, and `assets/` together in a stable
   user-scoped agent-data directory outside project source control. Install
   versions side by side and switch a small `current` pointer atomically. Some
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
is installed and authenticated, the complete instruction tree is available, a
free readiness call succeeds, and a fresh session can discover the setup. If a
browser approval, host restart, or user choice is still required, say that the
install is waiting rather than calling it complete.

Verify instruction discovery and execution readiness separately. Test skill
discovery in a fresh session, then make the live readiness call in the same
session class that will perform ordinary work. A delegated child or subagent
may inherit skill files while its tool policy omits MCP or shell access; that
does not prove the main connection is missing or prove that the child can call
it.

For OpenClaw, apply the MCP guide's connection and request timeouts while
registering the MCP adapter. Its default short probe can report a tool-listing
timeout even when the server answers normally. Retry the live RPC with the
configured timeout before suggesting reauthentication. Runtime snapshots of
active execs or subagents can lag; do not restart OAuth or terminate work from
that label alone when the waiting process or RPC remains healthy.

Report execution adapter and authentication, instruction-delivery tier and
version, fresh-session activation, local authoring, and hosted execution
separately. Tool counts shown by a plugin bridge may describe only the bridge;
use the selected adapter's live tool listing as the authority. For a local
gateway, a successful RPC probe is stronger evidence than a service-manager
label such as loaded or unloaded. If a structured ask-user channel is down,
ask the same necessary question in plain text instead of failing the setup.
