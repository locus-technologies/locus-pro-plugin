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
  // Hermes clips skill descriptions to 60 characters in its system prompt, so
  // a longer shared description supplies its own metadata.short-description.
  const unquote = (value) => value.trim().replace(/^['"]|['"]$/g, "");
  const shortDescription = frontmatter.match(/^ {2}short-description:(.*)$/m)?.[1];
  const description = unquote(shortDescription ?? line("description").slice("description:".length));
  if (description.length > 60) {
    throw new Error(`${path}: Hermes description exceeds 60 characters; add metadata.short-description`);
  }
  const descriptionLine = `description: ${/[:#]/.test(description) ? JSON.stringify(description) : description}`;
  writeFileSync(
    path,
    [
      "---",
      line("name"),
      descriptionLine,
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
