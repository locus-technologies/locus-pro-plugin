<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus/references/discovery.md, mirrored 2026-09-11 for the versioned Locus guide bundle. content-sha256: 69281ca4abfbc698899d3dddd6dbcca8072d0def36b36005ab02c3bfd4a55dfb -->

# Capability discovery

Describe the user outcome in `search_apis`; provider names are optional. When
the task maps to a broad area, retrieve current category or pack IDs with
`list_tool_groups`, then apply those IDs as binding filters. An explicit
category plus pack is an intersection. Unknown filters must be corrected from
the server's bounded suggestions, never dropped or silently broadened.

Use a matching exposed Recipe or already-inspected binding directly. Otherwise
inspect a selected result with `describe_api` before execution. Reuse a valid
binding across rows and retries instead of rediscovering it repeatedly. Search
and group membership do not enable tools, expand scopes, or approve spend.
