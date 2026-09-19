#!/usr/bin/env node

import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "skills");
const outputRoot = join(root, "agents/hermes/skills");

rmSync(outputRoot, { recursive: true, force: true });
cpSync(sourceRoot, outputRoot, { recursive: true });

for (const entry of readdirSync(outputRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = join(outputRoot, entry.name, "SKILL.md");
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${path}: missing frontmatter`);
  const [, frontmatter, body] = match;
  const line = (field, indent = "") => {
    const value = frontmatter.match(new RegExp(`^${indent}${field}:.*$`, "m"))?.[0];
    if (!value) throw new Error(`${path}: missing ${field}`);
    return value;
  };
  writeFileSync(
    path,
    [
      "---",
      line("name"),
      line("description"),
      line("license"),
      "metadata:",
      line("author", "  "),
      line("version", "  "),
      line("environment", "  "),
      "---",
      body,
    ].join("\n"),
  );
}

console.log("Generated agents/hermes/skills from skills");
