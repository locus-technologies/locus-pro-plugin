<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/host-adapters.md, mirrored 2026-09-14 for the versioned Locus guide bundle. content-sha256: 5dd8d0812176dcda64f8a9c51f0e885bc042a1a16393cc2e38efd97c07b79e97 -->

# Host adapters and readiness

Probe the actual host surface: native plugin installation, MCP registration,
tool invocation, registered or virtual skill storage, shell access, network
access, and hosted Workflow availability. Unknown is not false. Reuse a healthy
existing connection; do not install a separate CLI grant beside MCP by default.

Select MCP or CLI as the execution interface independently from instruction
delivery. Prefer MCP when the host supports native remote-MCP OAuth unless the
user explicitly selected CLI. Never add both execution paths or create a second
grant merely to change how instructions are stored.

Deliver the released `locus`, `locus-setup`, and `locus-workflows` trees through
the first supported tier:

1. **Native registration.** Prefer the verified official plugin or the host's
   approved persistent or virtual skill registry. Verify discovery in a fresh
   session; installation alone is not activation.
2. **Persistent filesystem.** When native registration is unavailable but the
   agent can persist and reopen files, download the exact per-skill archives
   from the official release selected by the Locus compatibility record. Verify
   every archive against `agent-skills-index.json`. Extract complete trees into
   a stable user-scoped agent-data directory outside project source control;
   keep `SKILL.md`, `references/`, and `assets/` together. Install versions side
   by side and switch a small `current` pointer atomically. If the host supports
   a persistent instruction index, preserve its existing content and add only
   the installed paths, version, and digest. Otherwise reopen the relevant
   `SKILL.md` by exact path before Locus work and report fresh-session automatic
   activation as unverified.
3. **Remote retrieval.** Only when the host lacks both native skill support and
   usable persistent storage, connect MCP and call `get_locus_guide` for the
   released index and task-specific resources. Pin the bundle version and
   digest for the task and retrieve them again after context loss.

A local tree is durable operating knowledge even when the host does not
register it as a native skill. Do not claim native activation for that tier,
and do not treat any instruction-delivery method as permission to authenticate,
enable tools, spend credits, or write to external systems.

Report connection, instruction-delivery tier and version, fresh-session
activation, local authoring, and hosted execution separately. A host approval
or restart may remain after the files are present.
