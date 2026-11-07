#!/usr/bin/env node

// Devin loads a plugin root's AGENTS.md as an always-on rule for every user,
// so the Devin plugin lives in agents/devin with its own copy of the skills
// and logo instead of at the repository root next to the contributor guide.
import { cpSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(root, "agents/devin");

for (const path of ["skills", "assets/logo.svg"]) {
  rmSync(join(pluginRoot, path), { recursive: true, force: true });
  cpSync(join(root, path), join(pluginRoot, path), { recursive: true });
}

console.log("Generated agents/devin/skills and assets from the repository root");
