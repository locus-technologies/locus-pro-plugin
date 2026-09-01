#!/usr/bin/env node
// Consistency checks across the per-agent manifests. CI fails on any drift.
import { readFileSync, existsSync } from "node:fs";
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
const OTHER_VENDOR_WORDS = /\b(Claude|Codex|Cursor|ChatGPT|OpenClaw|Gemini|Copilot|Grok|Kimi)\b/;

// --- Plugin manifests: same name, same version everywhere -------------------
const manifests = {
  ".claude-plugin/plugin.json": json(".claude-plugin/plugin.json"),
  ".cursor-plugin/plugin.json": json(".cursor-plugin/plugin.json"),
  ".codex-plugin/plugin.json": json(".codex-plugin/plugin.json"),
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
  { path: "agents/codex/.mcp.json", wrapped: false, type: "http", source: "codex-plugin" },
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

// --- Skill: neutral wording, bounded description, no secrets ----------------
const skill = read("skills/locus/SKILL.md");
const fm = skill.match(/^---\n([\s\S]*?)\n---/);
if (!fm) {
  errors.push("skills/locus/SKILL.md: missing YAML frontmatter");
} else {
  const nameLine = fm[1].match(/^name:\s*(.+)$/m);
  if (nameLine?.[1].trim() !== EXPECTED_NAME) errors.push(`SKILL.md: frontmatter name "${nameLine?.[1]}"`);
  const descLine = fm[1].match(/^description:\s*(.+)$/m);
  if (!descLine) errors.push("SKILL.md: missing description");
  else if (descLine[1].trim().length > 160) errors.push(`SKILL.md: description is ${descLine[1].trim().length} chars (max 160 for registry portability)`);
  // Dep-free approximation of "metadata values must be strings": rejects
  // nested block mappings, inline objects/arrays, and bare bool/number values.
  const metaBlock = fm[1].match(/^metadata:\n((?:[ ]{2,}.*\n?)*)/m);
  if (metaBlock) {
    if (/^\s{2,}\S[^:\n]*:\s*$/m.test(metaBlock[1])) {
      errors.push("SKILL.md: metadata values must be flat strings (Agent Skills spec) — no nested blocks");
    }
    if (/^\s{2,}\S[^:\n]*:\s+(?:[\[{]|(?:true|false|null|-?\d+(?:\.\d+)?)\s*$)/m.test(metaBlock[1])) {
      errors.push("SKILL.md: metadata values must be strings — no inline objects, arrays, booleans, or numbers");
    }
  }
}
if (OTHER_VENDOR_WORDS.test(skill)) {
  errors.push("SKILL.md: names a specific vendor's agent — keep the skill provider-neutral");
}

// --- Secret scan over every checked file ------------------------------------
const scanned = [
  ...Object.keys(manifests),
  ...mcpConfigs.map((c) => c.path),
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "skills/locus/SKILL.md",
  "README.md",
];
const SECRET = /\b(?:lcr|lcac|lcrsb|lcrpk|sk_live|sk_test)_[A-Za-z0-9]{8,}/;
for (const path of scanned) {
  if (SECRET.test(read(path))) errors.push(`${path}: contains what looks like a real credential`);
}

if (errors.length) {
  console.error(`check-manifests: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-manifests: OK (version ${manifestVersion})`);
