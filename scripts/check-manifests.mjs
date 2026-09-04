#!/usr/bin/env node
// Consistency checks across the per-agent manifests. CI fails on any drift.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const read = (p) => readFileSync(resolve(root, p), "utf8");
const json = (p) => {
  try {
    return JSON.parse(read(p));
  } catch (e) {
    errors.push(`${p}: invalid JSON (${e.message})`);
    return null;
  }
};

const EXPECTED_NAME = "locus";
const EXPECTED_URL = "https://api.paywithlocus.com/api/credits/mcp";
const REPO_SLUG = "locus-technologies/locus-pro-plugin";
const REPO_URL = `https://github.com/${REPO_SLUG}`;
const OLD_REPO_SLUG = "locus-technologies/locus-plugin";
const OTHER_VENDOR_WORDS = /\b(Claude|Codex|Cursor|ChatGPT|OpenClaw|Gemini|Copilot|Grok|Kimi)\b/;

// --- Plugin manifests: same name, same version everywhere -------------------
const manifests = {
  ".claude-plugin/plugin.json": json(".claude-plugin/plugin.json"),
  ".cursor-plugin/plugin.json": json(".cursor-plugin/plugin.json"),
  ".codex-plugin/plugin.json": json(".codex-plugin/plugin.json"),
  ".grok-plugin/plugin.json": json(".grok-plugin/plugin.json"),
  "plugin.json": json("plugin.json"),
};

const versions = new Set();
for (const [path, m] of Object.entries(manifests)) {
  if (!m) continue;
  if (m.name !== EXPECTED_NAME) errors.push(`${path}: name is "${m.name}", expected "${EXPECTED_NAME}"`);
  if (!m.version) errors.push(`${path}: missing version`);
  else versions.add(m.version);
  if (m.description && OTHER_VENDOR_WORDS.test(m.description)) {
    errors.push(`${path}: description names another vendor's agent — keep it provider-neutral`);
  }
  if ("repository" in m && m.repository !== REPO_URL) {
    errors.push(`${path}: repository "${m.repository}" != "${REPO_URL}"`);
  }
  for (const ref of [m.skills, m.mcpServers, m.logo, m.interface?.logo].flat().filter((v) => typeof v === "string")) {
    if (ref.startsWith("http")) continue;
    if (!existsSync(resolve(root, ref))) errors.push(`${path}: referenced path "${ref}" does not exist`);
  }
}
const manifestVersion = [...versions][0];
if (versions.size > 1) errors.push(`plugin manifests disagree on version: ${[...versions].join(", ")}`);

if (!manifestVersion) errors.push("no plugin manifest carries a version");
for (const [path, expected] of [
  ["version.txt", read("version.txt").trim()],
  [".release-please-manifest.json", json(".release-please-manifest.json")?.["."]],
]) {
  if (!expected) errors.push(`${path}: missing version entry`);
  else if (manifestVersion && expected !== manifestVersion) {
    errors.push(`${path}: version ${expected} != manifest version ${manifestVersion}`);
  }
}

// --- MCP configs: same server key, same URL, expected attribution header ----
const mcpConfigs = [
  { path: "agents/claude/.mcp.json", wrapped: true, type: "http", source: "claude-code-plugin" },
  { path: "agents/cursor/mcp.json", wrapped: true, type: "http", source: "cursor-plugin" },
  { path: "agents/grok/mcp.json", wrapped: true, type: "http", source: "grok-plugin" },
  { path: "mcp.json", wrapped: true, type: "streamable-http", source: "open-plugin" },
];

for (const { path, wrapped, type, source } of mcpConfigs) {
  const cfg = json(path);
  if (!cfg) continue;
  const servers = wrapped ? cfg.mcpServers : cfg;
  if (!servers || typeof servers !== "object") {
    errors.push(`${path}: expected ${wrapped ? "an mcpServers object" : "a server map"}`);
    continue;
  }
  const keys = Object.keys(servers);
  if (keys.length !== 1 || keys[0] !== EXPECTED_NAME) {
    errors.push(`${path}: server keys [${keys.join(", ")}], expected exactly ["${EXPECTED_NAME}"]`);
    continue;
  }
  const server = servers[EXPECTED_NAME];
  if (server.url !== EXPECTED_URL) errors.push(`${path}: url "${server.url}" != "${EXPECTED_URL}"`);
  if (server.type !== type) errors.push(`${path}: type "${server.type}", expected "${type}"`);
  const headers = server.headers ?? {};
  if (headers["X-Source-Name"] !== source) {
    errors.push(`${path}: X-Source-Name "${headers["X-Source-Name"]}", expected "${source}"`);
  }
  for (const h of Object.keys(headers)) {
    if (h !== "X-Source-Name") errors.push(`${path}: unexpected header "${h}" — only X-Source-Name is allowed`);
  }
}

const openPluginMcp = json("mcp.json");
if (openPluginMcp && openPluginMcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") {
  errors.push("mcp.json: missing or wrong Agent Plugins $schema");
}

// MCP Registry manifest: the registry pins immutable versions, so this file
// must move in lockstep with the plugin manifests (release-please bumps it).
const registryServer = json("server.json");
if (registryServer) {
  if (registryServer.name !== "com.paywithlocus/locus") {
    errors.push(`server.json: name "${registryServer.name}" != "com.paywithlocus/locus"`);
  }
  if (manifestVersion && registryServer.version !== manifestVersion) {
    errors.push(`server.json: version ${registryServer.version} != manifest version ${manifestVersion}`);
  }
  const remote = registryServer.remotes?.[0];
  if (remote?.url !== EXPECTED_URL || remote?.type !== "streamable-http") {
    errors.push('server.json: remotes[0] must be {type: "streamable-http", url: <the MCP endpoint>}');
  }
  if (registryServer.repository?.url !== REPO_URL) {
    errors.push(`server.json: repository.url "${registryServer.repository?.url}" != "${REPO_URL}"`);
  }
}

const glama = json("glama.json");
if (glama) {
  if (glama.$schema !== "https://glama.ai/mcp/schemas/server.json") {
    errors.push("glama.json: missing or wrong $schema");
  }
  const maintainers = glama.maintainers;
  if (!Array.isArray(maintainers) || maintainers.length === 0 || !maintainers.every((entry) => typeof entry === "string" && entry.length > 0)) {
    errors.push("glama.json: maintainers must be a nonempty array of GitHub usernames");
  }
}

// Codex uses an inline mcpServers object in its manifest (its ingestion
// contract only allows a string pointer when it resolves to root .mcp.json,
// and Codex reads http_headers, not headers).
const codexServers = manifests[".codex-plugin/plugin.json"]?.mcpServers;
if (typeof codexServers !== "object" || Array.isArray(codexServers) || codexServers === null) {
  errors.push(".codex-plugin/plugin.json: mcpServers must be an inline object");
} else {
  const keys = Object.keys(codexServers);
  if (keys.length !== 1 || keys[0] !== EXPECTED_NAME) {
    errors.push(`.codex-plugin/plugin.json: mcpServers keys [${keys.join(", ")}], expected exactly ["${EXPECTED_NAME}"]`);
  } else {
    const server = codexServers[EXPECTED_NAME];
    if (server.url !== EXPECTED_URL) errors.push(`.codex-plugin/plugin.json: url "${server.url}" != "${EXPECTED_URL}"`);
    if (server.type !== "http") errors.push(`.codex-plugin/plugin.json: type "${server.type}", expected "http"`);
    if ("headers" in server) errors.push('.codex-plugin/plugin.json: use http_headers (Codex silently drops "headers")');
    const httpHeaders = Object.keys(server.http_headers ?? {});
    if (httpHeaders.length !== 1 || server.http_headers?.["X-Source-Name"] !== "codex-plugin") {
      errors.push('.codex-plugin/plugin.json: http_headers must be exactly {"X-Source-Name": "codex-plugin"}');
    }
  }
}
if (manifests[".codex-plugin/plugin.json"] && !Array.isArray(manifests[".codex-plugin/plugin.json"].interface?.capabilities)) {
  errors.push(".codex-plugin/plugin.json: interface.capabilities array is required by the Codex validation contract");
}
if (manifests[".codex-plugin/plugin.json"] && !/^https:\/\/\S+$/.test(manifests[".codex-plugin/plugin.json"].interface?.supportURL ?? "")) {
  errors.push(".codex-plugin/plugin.json: interface.supportURL must be a public https URL (OpenAI requires one for MCP-backed listings)");
}

// --- Marketplace manifests --------------------------------------------------
const claudeMarket = json(".claude-plugin/marketplace.json");
if (claudeMarket) {
  const entry = claudeMarket.plugins?.[0];
  if (claudeMarket.name !== EXPECTED_NAME) errors.push(`.claude-plugin/marketplace.json: marketplace name "${claudeMarket.name}"`);
  if (entry?.name !== EXPECTED_NAME || entry?.source !== "./") {
    errors.push(`.claude-plugin/marketplace.json: first plugin must be name "${EXPECTED_NAME}" with source "./"`);
  }
}
const codexMarket = json(".agents/plugins/marketplace.json");
if (codexMarket) {
  const entry = codexMarket.plugins?.[0];
  if (entry?.name !== EXPECTED_NAME || entry?.source?.path !== "./") {
    errors.push(`.agents/plugins/marketplace.json: first plugin must be name "${EXPECTED_NAME}" with source.path "./"`);
  }
  if (!codexMarket.interface?.displayName) {
    errors.push(".agents/plugins/marketplace.json: missing interface.displayName");
  }
}

// --- Skills: neutral wording, bounded descriptions, spec-clean frontmatter --
const skillPaths = readdirSync(resolve(root, "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ name: d.name, path: `skills/${d.name}/SKILL.md` }));
if (skillPaths.length === 0) errors.push("skills/: no skills found");
const declaredEnvVars = new Map();

for (const { name, path } of skillPaths) {
  if (!existsSync(resolve(root, path))) {
    errors.push(`${path}: missing SKILL.md`);
    continue;
  }
  const skill = read(path);
  const fm = skill.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    errors.push(`${path}: missing YAML frontmatter`);
  } else {
    const nameLine = fm[1].match(/^name:\s*(.+)$/m);
    if (nameLine?.[1].trim() !== name) {
      errors.push(`${path}: frontmatter name "${nameLine?.[1]?.trim()}" != directory name "${name}"`);
    }
    const descLine = fm[1].match(/^description:\s*(.+)$/m);
    if (!descLine) errors.push(`${path}: missing description`);
    else if (descLine[1].trim().length > 160) {
      errors.push(`${path}: description is ${descLine[1].trim().length} chars (max 160 for registry portability)`);
    }
    // Metadata stays a flat string map for cross-registry portability, with
    // one sanctioned exception: the `openclaw:` block, which ClawHub requires
    // for env/runtime declarations (undeclared env vars are a moderation
    // flag there). Strip that block, then apply the flat-string rules.
    const versionLine = fm[1].match(/^version:\s*["']?(\S+?)["']?\s*$/m);
    if (!versionLine || !/^\d+\.\d+\.\d+$/.test(versionLine[1])) {
      errors.push(`${path}: frontmatter needs a semver version (registry publishes require one)`);
    }
    // Imperative metadata extraction: a regex capture stops at the first
    // blank line, which would let everything after it escape these checks.
    const fmLines = fm[1].split("\n");
    if (fmLines.filter((line) => /^metadata:\s*$/.test(line)).length > 1) {
      errors.push(`${path}: duplicate metadata keys in frontmatter`);
    }
    if (fmLines.filter((line) => /^ {2}openclaw:\s*$/.test(line)).length > 1) {
      errors.push(`${path}: duplicate openclaw blocks in metadata`);
    }
    const metaStart = fmLines.findIndex((line) => /^metadata:\s*$/.test(line));
    if (metaStart !== -1) {
      const metaLines = [];
      for (let i = metaStart + 1; i < fmLines.length; i++) {
        const line = fmLines[i];
        if (/^ {2,}/.test(line) || line.trim() === "" || /^\s*#/.test(line)) {
          metaLines.push(line);
          continue;
        }
        break;
      }
      const kept = [];
      const openclawLines = [];
      let inOpenclaw = false;
      for (const line of metaLines) {
        if (/^ {2}openclaw:\s*$/.test(line)) {
          inOpenclaw = true;
          continue;
        }
        if (inOpenclaw && (/^ {4,}/.test(line) || line.trim() === "" || /^\s*#/.test(line))) {
          openclawLines.push(line);
          continue;
        }
        inOpenclaw = false;
        kept.push(line);
      }
      const flat = kept.filter((line) => line.trim() !== "" && !/^\s*#/.test(line)).join("\n");
      if (/^\s*- /m.test(flat)) {
        errors.push(`${path}: metadata top level must be a mapping — sequences belong under openclaw.envVars only`);
      }
      if (/^\s{2,}\S[^:\n]*:\s*$/m.test(flat)) {
        errors.push(`${path}: metadata values must be flat strings outside the openclaw block — no other nested blocks`);
      }
      if (/^\s{2,}\S[^:\n]*:\s+(?:[\[{]|(?:true|false|null|-?\d+(?:\.\d+)?)\s*$)/m.test(flat)) {
        errors.push(`${path}: metadata values must be strings — no inline objects, arrays, booleans, or numbers`);
      }
      if (openclawLines.filter((line) => /^ {4}envVars:\s*$/.test(line)).length > 1) {
        errors.push(`${path}: duplicate envVars blocks under openclaw`);
      }
      const OPENCLAW_KEYS = new Set([
        "homepage",
        "emoji",
        "primaryEnv",
        "envVars",
        "requires",
        "anyBins",
        "os",
        "always",
        "install",
        "skillKey",
      ]);
      let inEnvVars = false;
      const declaredEnvNames = [];
      let primaryEnv;
      for (const line of openclawLines) {
        if (line.trim() === "" || /^\s*#/.test(line)) continue;
        const topKey = line.match(/^ {4}([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
        if (topKey) {
          if (!OPENCLAW_KEYS.has(topKey[1])) {
            errors.push(`${path}: unexpected openclaw key "${topKey[1]}"`);
          }
          inEnvVars = topKey[1] === "envVars";
          if (topKey[1] === "primaryEnv") primaryEnv = topKey[2].trim();
          continue;
        }
        const item = line.match(/^ {6,}- name:\s*(\S+)\s*$/);
        if (item && inEnvVars) {
          declaredEnvNames.push(item[1]);
          continue;
        }
        if (/^\s*- /.test(line) && !inEnvVars) {
          errors.push(`${path}: sequence items in openclaw are only allowed under envVars`);
        }
      }
      if (primaryEnv && !declaredEnvNames.includes(primaryEnv)) {
        errors.push(`${path}: openclaw.primaryEnv "${primaryEnv}" is not declared under envVars`);
      }
      const skillDeclared = declaredEnvVars.get(name) ?? new Set();
      for (const envName of declaredEnvNames) skillDeclared.add(envName);
      if (primaryEnv) skillDeclared.add(primaryEnv);
      declaredEnvVars.set(name, skillDeclared);
    }
  }
  if (OTHER_VENDOR_WORDS.test(skill)) {
    errors.push(`${path}: names a specific vendor's agent — keep the skill provider-neutral`);
  }
}

// --- Secret scan over every checked file ------------------------------------
const skillFiles = readdirSync(resolve(root, "skills"), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `skills/${resolve(entry.parentPath ?? entry.path, entry.name).slice(resolve(root, "skills").length + 1)}`);

const scanned = [
  ...Object.keys(manifests),
  ...mcpConfigs.map((c) => c.path),
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "server.json",
  "glama.json",
  ...skillFiles,
  "README.md",
];
const SECRET = /\b(?:lcr|lcac|lcrsb|lcrpk|sk_live|sk_test)_[A-Za-z0-9]{8,}/;
const ENV_TOKEN =
  /\b(?:(?:LOCUS|AGENTMAIL|HERMES|OKIBI)_[A-Z0-9_]+|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:KEY|TOKEN|SECRET|CREDENTIAL|PASSWORD|HOME))\b/g;
for (const path of scanned) {
  const content = read(path);
  if (SECRET.test(content)) errors.push(`${path}: contains what looks like a real credential`);
  if (content.includes(OLD_REPO_SLUG)) {
    errors.push(`${path}: references the retired repo slug "${OLD_REPO_SLUG}"`);
  }
  if (path.startsWith("skills/")) {
    const owningSkill = path.split("/")[1];
    const skillDeclared = declaredEnvVars.get(owningSkill) ?? new Set();
    const referenced = new Set([...content.matchAll(ENV_TOKEN)].map((m) => m[0]));
    // Explicit env-access syntax counts regardless of naming convention.
    for (const m of content.matchAll(/\$\{?([A-Z][A-Z0-9_]{3,})\}?|process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      referenced.add(m[1] ?? m[2]);
    }
    for (const match of referenced) {
      if (!skillDeclared.has(match)) {
        errors.push(`${path}: env-style token ${match} is not declared under this skill's openclaw.envVars`);
      }
    }
  }
}

// Mirrored reference excerpts carry a content digest in their provenance
// header; a drifted or tampered mirror fails here instead of at a registry.
for (const path of skillFiles.filter((p) => p.includes("/references/"))) {
  const raw = read(path);
  // The provenance header must open the file and close before the body:
  // an unanchored header would let prepended content go unhashed, and a
  // missing terminator would hash empty content and "pass".
  if (!raw.startsWith("<!-- Scoped excerpt of https://")) {
    errors.push(`${path}: mirror must begin with its provenance header`);
    continue;
  }
  const digest = raw.match(/content-sha256:\s*([0-9a-f]{64})/);
  const headerEnd = raw.indexOf("-->\n");
  if (!digest || headerEnd === -1 || raw.indexOf("content-sha256:") > headerEnd) {
    errors.push(`${path}: mirror provenance header needs a terminated comment carrying content-sha256`);
    continue;
  }
  const body = raw.slice(headerEnd + 4).replace(/^\n+/, "");
  const actual = createHash("sha256").update(body).digest("hex");
  if (actual !== digest[1]) {
    errors.push(`${path}: content does not match its recorded sha256 — refresh the mirror and its digest together`);
  }
}

// --- OpenAI submission bundle -----------------------------------------------
// The uploaded chatgpt-app-submission.json must stay parseable, keep its
// review-facing identity aligned with the Codex manifest, and keep the
// counts the portal requires (>=5 positive, >=3 negative test cases).
const submission = json("chatgpt-app-submission.json");
if (submission) {
  if (submission.$schema !== "https://developers.openai.com/plugins/schemas/chatgpt-app-submission.v1.json" || submission.schema_version !== 1) {
    errors.push("chatgpt-app-submission.json: wrong $schema or schema_version");
  }
  const codexInterface2 = manifests[".codex-plugin/plugin.json"]?.interface;
  if (codexInterface2 && submission.app_info?.subtitle !== codexInterface2.shortDescription) {
    errors.push("chatgpt-app-submission.json: app_info.subtitle must equal the Codex manifest shortDescription");
  }
  if ((submission.test_cases?.length ?? 0) < 5) {
    errors.push("chatgpt-app-submission.json: at least 5 positive test_cases required");
  }
  if ((submission.negative_test_cases?.length ?? 0) < 3) {
    errors.push("chatgpt-app-submission.json: at least 3 negative_test_cases required");
  }
  for (const [name, tool] of Object.entries(submission.tools ?? {})) {
    for (const key of ["read_only_justification", "open_world_justification", "destructive_justification"]) {
      if (!tool?.justifications?.[key]) errors.push(`chatgpt-app-submission.json: tools.${name} missing ${key}`);
    }
  }
}

if (errors.length) {
  console.error(`check-manifests: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-manifests: OK (version ${manifestVersion})`);
