# Contributor and release instructions

This repository is one coordinated plugin release with several host-specific
manifests. Treat `version.txt` as the canonical plugin version. The Claude,
Codex, Cursor, Grok, Agent Plugins, and MCP Registry manifests must always use
that exact version; `node scripts/version.mjs check` and CI enforce the fan-out.
The independent `metadata.version` values inside each `SKILL.md` describe the
skill contract and change only when that skill changes.

Never commit credentials, OAuth tokens, generated stage fixtures, or a stage
URL to a tracked production manifest. Stage calls use real isolated accounts
and may spend stage credits on real providers.

## Branch and release flow

- Open normal change pull requests against `stage`.
- CI never selects, increments, or commits a version. Before promotion, a
  maintainer chooses the next strict SemVer release and runs
  `node scripts/version.mjs set X.Y.Z` on `stage`. Add a non-empty
  `## X.Y.Z (YYYY-MM-DD)` section to `CHANGELOG.md`, review the resulting
  manifest changes, and commit them through the normal review process.
- Run `node scripts/version.mjs check` after setting the version. This checks
  every host manifest and the changelog without modifying files.
- Promote only with a pull request whose head is `stage` and base is `main`.
  CI rejects every other route to `main` and rejects a promotion without a
  version newer than the latest tag.
- The Promote workflow keeps that PR evergreen on every push to `stage`, but
  creating PRs requires a token permitted to do so: either enable "Allow
  GitHub Actions to create and approve pull requests" (repo/org Settings >
  Actions > General > Workflow permissions), or store a PAT with pull-request
  write access as the `PROMOTE_TOKEN` repository secret, which the workflow
  prefers when present. Without one of these the workflow fails loudly and
  the promotion PR must be opened by hand.
- After the validated promotion merges, `Release` creates the immutable tag,
  GitHub release, checksums, complete plugin archive, per-skill archives, and a
  digest-stamped `agent-skills-index.json`. It then publishes the matching
  `server.json` to the official MCP Registry.
- The MCP Registry job requires the repository secret `MCP_PRIVATE_KEY`. It is
  the raw Ed25519 private key matching the public `v=MCPv1` TXT record on
  `paywithlocus.com`. Set it through GitHub's encrypted secret input; never put
  it in a file in this repository or in a workflow argument committed here.
- `MCP_PRIVATE_KEY` setup: the DNS record already publishes the public key
  (`dig TXT paywithlocus.com` shows the `v=MCPv1` entry), so in the normal
  case just add the matching private key at Settings > Secrets and variables >
  Actions > New repository secret with the exact name `MCP_PRIVATE_KEY`. The
  value must be the raw 32-byte Ed25519 seed as 64 hex characters (no `0x`
  prefix, no PEM armor) — from the original `key.pem`: `openssl pkey -in
  key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n'`. The
  Release workflow validates this shape before attempting login. If
  the matching private key is lost, generate a new Ed25519 keypair per the
  official registry publishing docs, replace the `v=MCPv1` TXT value at the
  DNS provider, wait for propagation, then store the new private key as the
  secret. GitHub OIDC login is not applicable here: it only works for
  `io.github.*` namespaces, while this server publishes under the custom
  `com.paywithlocus/locus` DNS namespace.
- Without the secret the Release workflow fails loudly at the registry step
  with setup instructions; the GitHub release itself is still created. Fix by
  adding the secret and rerunning the failed Release (it is idempotent and
  skips the already-published GitHub assets).
- The release is idempotent. A rerun verifies that an existing tag points to
  the same commit, repairs release assets, and skips an MCP Registry version
  that is already present.

Git-backed installs (the repository marketplaces used by Claude Code, Codex,
Grok, OpenClaw, Agent Plugins, and Agent Skills) see the promoted `main`
commit. OpenAI's universal Plugins Directory and Cursor's public Marketplace
are review-gated: their portals require a new reviewed version and do not
offer a CI publication API. Never claim that a GitHub release bypasses those
reviews. The generated `agent-skills-index.json` is the exact payload to copy
in a reviewed AgentPay pull request at
`apps/landing/public/.well-known/agent-skills/index.json`.

## Post-release manual steps (per version, no CI API)

Every GitHub release appends this checklist to its notes; work through it
after the Release workflow finishes:

- OpenAI Platform dashboard: new draft of the Locus app from the release,
  resubmit, publish after approval (publishing also creates the Codex
  directory plugin). Updates take a new review (typically weeks); one version
  in review at a time.
- Cursor: request a re-index at cursor.com/marketplace/publish (now
  centralized via cursor.directory) after the release. Team marketplaces with
  Auto Refresh pick up the new `main` on their own; the public listing does not.
- Confirm the new MCP Registry version is listed; Glama and PulseMCP sync
  from it without further action.

Out of scope for this repo: Vercel Marketplace lists deployable product
integrations backed by a provider-hosted integration server (provider program
plus email review), not agent plugins, so there is nothing in this repo to
push there. Smithery ownership is already DNS-verified
(`smithery-verification` TXT on `paywithlocus.com`); publishing new versions
there is a separate manual `smithery mcp publish` step until credentials are
added to CI.

## Discoverability assets
- Keep the GitHub repo topics intact (`mcp`, `model-context-protocol`,
  `mcp-server`, plus the client tags). Glama auto-indexes public repos from
  topics plus README; removing `mcp` drops that discovery path.
- `assets/logo.png` is the 400x400 PNG required by visual marketplace
  listings (Cline, cursor.directory). Keep it in sync with `assets/logo.svg`;
  it ships inside the release archives via the `assets` release path.

## Required local checks

Run these from the repository root before requesting review:

```bash
node scripts/version.mjs check
node scripts/check-manifests.mjs
npx -y @anthropic-ai/claude-code@2.1.259 plugin validate . --strict
npx -y @anthropic-ai/claude-code@2.1.259 plugin validate .claude-plugin/marketplace.json --strict
node scripts/smoke-production.mjs
```

Validate all portable skills with the pinned reference implementation used
in CI:

```bash
LOCUS_SKILLS_VENV="$(mktemp -d)/skills-ref"
python3 -m venv "$LOCUS_SKILLS_VENV"
"$LOCUS_SKILLS_VENV/bin/pip" install \
  'git+https://github.com/agentskills/agentskills.git@69ef37e9424c0a7ea9dd2293b559e43ec8176379#subdirectory=skills-ref'
"$LOCUS_SKILLS_VENV/bin/skills-ref" validate skills/locus
"$LOCUS_SKILLS_VENV/bin/skills-ref" validate skills/locus-setup
"$LOCUS_SKILLS_VENV/bin/skills-ref" validate skills/locus-workflows
```

If Grok is installed, also run:

```bash
grok plugin validate .
```

Build and verify the exact release artifacts without publishing them:

```bash
LOCUS_RELEASE_DIR="$(mktemp -d)/release"
node scripts/build-release.mjs "$LOCUS_RELEASE_DIR"
for archive in "$LOCUS_RELEASE_DIR"/*.zip; do unzip -t "$archive"; done
(cd "$LOCUS_RELEASE_DIR" && shasum -a 256 -c CHECKSUMS.sha256)
```

## Build an isolated stage fixture

Published plugin versions always target production. Do not publish a stage
version to a public directory or registry. Generate a disposable copy that
rewrites only the API/dashboard origins and leaves the tracked checkout clean:

```bash
LOCUS_FIXTURE_ROOT="$(mktemp -d)"
LOCUS_STAGE_PLUGIN="$LOCUS_FIXTURE_ROOT/locus"
node scripts/build-test-fixture.mjs \
  --environment stage \
  --output "$LOCUS_STAGE_PLUGIN"
```

The generated MCP endpoint must be
`https://api.stage.paywithlocus.com/api/credits/mcp`. Use an isolated client
profile where the host supports one. Authenticate through the stage OAuth
flow, first call a free operation such as `get_balance`, and make a paid test
call only when the test explicitly requires it.

### Claude Code

```bash
LOCUS_CLAUDE_TEST_CONFIG="$(mktemp -d)"
CLAUDE_CONFIG_DIR="$LOCUS_CLAUDE_TEST_CONFIG" claude plugin marketplace add "$LOCUS_STAGE_PLUGIN"
CLAUDE_CONFIG_DIR="$LOCUS_CLAUDE_TEST_CONFIG" claude plugin install locus@locus
CLAUDE_CONFIG_DIR="$LOCUS_CLAUDE_TEST_CONFIG" claude
```

In Claude Code, run `/mcp`, authenticate `locus`, confirm both skills are
present, and run a free balance check. Keeping `CLAUDE_CONFIG_DIR` isolated
prevents the production marketplace/install from shadowing the fixture.

### Codex

```bash
LOCUS_CODEX_TEST_HOME="$(mktemp -d)"
CODEX_HOME="$LOCUS_CODEX_TEST_HOME" codex plugin marketplace add "$LOCUS_STAGE_PLUGIN" --json
CODEX_HOME="$LOCUS_CODEX_TEST_HOME" codex plugin add locus@locus --json
CODEX_HOME="$LOCUS_CODEX_TEST_HOME" codex mcp login locus
CODEX_HOME="$LOCUS_CODEX_TEST_HOME" codex
```

Confirm `codex mcp list --json` reports the stage URL and the
`X-Source-Name: codex-plugin` header before exercising the skills.

### Cursor

Cursor discovers local plugins from `~/.cursor/plugins/local`. If a Marketplace
copy named `locus` is installed, disable or uninstall it first because the
Marketplace copy takes precedence. Then link the disposable fixture only if
the destination does not already exist:

```bash
mkdir -p ~/.cursor/plugins/local
test ! -e ~/.cursor/plugins/local/locus
ln -s "$LOCUS_STAGE_PLUGIN" ~/.cursor/plugins/local/locus
```

Run `Developer: Reload Window`, open Customize, verify the Locus skill and MCP
server, authenticate, and run a free balance check. Remove only the symlink you
created after the test. Enterprise workspaces must allow local plugin imports.

### Grok

```bash
grok plugin validate "$LOCUS_STAGE_PLUGIN"
grok plugin install "$LOCUS_STAGE_PLUGIN" --trust
```

Review the local source before passing `--trust`. Start a new Grok session,
authenticate the `locus` MCP connection, and verify a free balance call.

### OpenClaw

```bash
openclaw plugins install --link "$LOCUS_STAGE_PLUGIN" --force
openclaw plugins inspect locus --runtime --json
openclaw gateway restart
openclaw mcp login locus
```

The explicit local link is the development path. Inspect the resolved MCP URL
before login. Do not use a public marketplace install for stage testing.

### Agent Plugins and skill-only clients

For a host implementing the Agent Plugins CLI, install the local root:

```bash
npx plugins add "$LOCUS_STAGE_PLUGIN"
```

For a skill-only host, install from the generated repository tree, then add
the stage MCP URL in that host's normal MCP settings:

```bash
npx skills add "$LOCUS_STAGE_PLUGIN"
```

Verify that both `locus` and `locus-setup` were discovered. A skill-only
install does not configure MCP automatically.

### ChatGPT / OpenAI universal Plugins Directory

A public directory version cannot be pointed temporarily at stage and is a
reviewed snapshot. Test the stage MCP server as a development connection and
test the complete local package through the local Codex marketplace above.
For a new public version, update the draft in the OpenAI Platform, scan the
production MCP server again, upload/re-import the final skills, run the five
positive and three negative cases from `chatgpt-app-submission.json`, submit
for review, and publish only after approval.

### Cursor public Marketplace and MCP Registry

Cursor reviews every public update, so stage proof is the local Cursor import
above; request a re-index/review after the production release. The official
MCP Registry is immutable versioned production metadata and must never receive
a stage URL. Validate its production payload through `server.json`; publication
belongs only to the post-merge release workflow.

## Test a real published version

Use this when the host's public directory has not approved the new version yet
or when you need to prove the exact GitHub artifact. It targets production:

```bash
LOCUS_TEST_VERSION=0.2.1
LOCUS_PUBLISHED_ROOT="$(mktemp -d)"
gh release download "v$LOCUS_TEST_VERSION" \
  --repo locus-technologies/locus-pro-plugin \
  --dir "$LOCUS_PUBLISHED_ROOT"
(cd "$LOCUS_PUBLISHED_ROOT" && shasum -a 256 -c CHECKSUMS.sha256)
mkdir "$LOCUS_PUBLISHED_ROOT/plugin"
unzip -q "$LOCUS_PUBLISHED_ROOT/locus-plugin-v$LOCUS_TEST_VERSION.zip" \
  -d "$LOCUS_PUBLISHED_ROOT/plugin"
```

Install `$LOCUS_PUBLISHED_ROOT/plugin` with the same local commands above.
For OpenClaw, the immutable Git form is also supported:

```bash
openclaw plugins install \
  "git:github.com/locus-technologies/locus-pro-plugin@v$LOCUS_TEST_VERSION" \
  --force
```
