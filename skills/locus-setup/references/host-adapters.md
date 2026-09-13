<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus-setup/references/host-adapters.md, mirrored 2026-09-11 for the versioned Locus guide bundle. content-sha256: 1993e491931bc1847998c38f3e5bd642ccfca9503183454483b421c7c718486b -->

# Host adapters and readiness

Probe the actual host surface: native plugin installation, MCP registration,
tool invocation, registered or virtual skill storage, shell access, network
access, and hosted Workflow availability. Unknown is not false. Reuse a healthy
existing connection; do not install a separate CLI grant beside MCP by default.

Prefer a verified native package. Otherwise use MCP plus registered skills,
CLI plus registered skills when explicitly requested, or MCP plus remote guide
retrieval. Report connection, guide delivery, fresh-session activation, local
authoring, and hosted execution separately. A file copied to disk is not proof
that the host registered it, and a host approval or restart may remain.
