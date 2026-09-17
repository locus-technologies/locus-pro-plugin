<!-- Scoped excerpt of https://github.com/locus-technologies/locus-pro-plugin/blob/main/skills/locus/references/media.md, mirrored 2026-09-11 for the versioned Locus guide bundle. content-sha256: e22ea7952f1ce5582d4009c44ba415bfe939c35e9b6593b063d0322cf2c52674 -->

# Generated media

Inspect supported formats, dimensions, model limits, safety constraints, and
whether execution is synchronous or returns a job. Keep the original receipt
and retrieve the completed artifact through the returned continuation rather
than rerunning generation after a timeout.

Do not assume an artifact URL is permanent or public. Preserve its declared
media type and tenant ownership. A request to generate media does not authorize
publishing it, replacing an existing user file, or granting third-party access.
