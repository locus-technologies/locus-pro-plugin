#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arguments_ = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = arguments_.indexOf(flag);
  return index === -1 ? undefined : arguments_[index + 1];
};
const environment = valueAfter("--environment");
const outputArgument = valueAfter("--output");
if (!new Set(["stage", "production"]).has(environment) || !outputArgument) {
  throw new Error(
    "Usage: node scripts/build-test-fixture.mjs --environment <stage|production> --output <new-directory>",
  );
}

const output = resolve(outputArgument);
if (output === root || output.startsWith(`${root}/.git/`)) throw new Error("Unsafe fixture output path");
if (existsSync(output)) throw new Error(`Fixture output already exists: ${output}`);

const paths = [
  ".agents",
  ".claude-plugin",
  ".codex-plugin",
  ".cursor-plugin",
  ".grok-plugin",
  ".mcp.json",
  "LICENSE",
  "README.md",
  "agents",
  "assets",
  "mcp.json",
  "plugin.json",
  "skills",
  "version.txt",
];

mkdirSync(output, { recursive: true });
for (const path of paths) {
  const source = join(root, path);
  const destination = join(output, path);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function rewriteTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) rewriteTree(path);
    else if (entry.isFile() && /\.(?:json|md)$/.test(entry.name)) {
      let contents = readFileSync(path, "utf8");
      if (environment === "stage") {
        contents = contents
          .replaceAll("https://api.paywithlocus.com", "https://api.stage.paywithlocus.com")
          .replaceAll("https://platform.paywithlocus.com", "https://platform.stage.paywithlocus.com")
          .replaceAll("All endpoints below are production.", "All endpoints below are stage.");
      }
      writeFileSync(path, contents);
    }
  }
}

rewriteTree(output);
const expectedMcpOrigin =
  environment === "stage" ? "https://api.stage.paywithlocus.com" : "https://api.paywithlocus.com";
for (const path of [
  ".mcp.json",
  "mcp.json",
  "agents/claude/.mcp.json",
  "agents/codex/.mcp.json",
  "agents/cursor/mcp.json",
  "agents/grok/mcp.json",
]) {
  const contents = readFileSync(join(output, path), "utf8");
  if (!contents.includes(`${expectedMcpOrigin}/api/credits/mcp`)) {
    throw new Error(`${path} does not target ${environment}`);
  }
}

writeFileSync(
  join(output, "TESTING.md"),
  `# Generated ${environment} fixture\n\nThis directory was generated from ${root}. It is not a release and must not be committed.\n\nMCP endpoint: \`${expectedMcpOrigin}/api/credits/mcp\`\n`,
);

if (!statSync(output).isDirectory()) throw new Error("Fixture output was not created");
console.log(output);
