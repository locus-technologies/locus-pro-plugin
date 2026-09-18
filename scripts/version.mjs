#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const jsonVersionFiles = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".grok-plugin/plugin.json",
  "agents/hermes/plugin.json",
  "plugin.json",
  "server.json",
];

const read = (path) => readFileSync(resolve(root, path), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function parseVersion(value, label = "version") {
  const match = value.match(semverPattern);
  if (!match) throw new Error(`${label} must be strict SemVer (x.y.z), got "${value}"`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = parseVersion(left, "left version");
  const b = parseVersion(right, "right version");
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function canonicalVersion() {
  const version = read("version.txt").trim();
  parseVersion(version, "version.txt");
  return version;
}

function changelogSection(version) {
  const changelog = read("CHANGELOG.md");
  const heading = new RegExp(`^## ${version.replaceAll(".", "\\.")}(?: \\([^\\n]+\\))?\\n`, "m");
  const match = heading.exec(changelog);
  if (!match) return null;
  const bodyStart = match.index + match[0].length;
  const nextHeading = changelog.indexOf("\n## ", bodyStart);
  return changelog.slice(bodyStart, nextHeading === -1 ? changelog.length : nextHeading).trim();
}

function checkVersionFanout({ requireChangelog = true } = {}) {
  const expected = canonicalVersion();
  const errors = [];
  for (const path of jsonVersionFiles) {
    const actual = JSON.parse(read(path)).version;
    if (actual !== expected) errors.push(`${path}: version ${JSON.stringify(actual)} != ${expected}`);
  }
  if (requireChangelog && !changelogSection(expected)) {
    errors.push(`CHANGELOG.md: missing non-empty section for ${expected}`);
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return expected;
}

function latestVersionTag() {
  const tags = git("tag", "--list", "v*", "--sort=-v:refname")
    .split("\n")
    .filter(Boolean);
  for (const tag of tags) {
    const version = tag.slice(1);
    if (semverPattern.test(version)) return { tag, version };
  }
  throw new Error("No v<major>.<minor>.<patch> release tag exists");
}

function setVersion(version) {
  parseVersion(version);
  writeFileSync(resolve(root, "version.txt"), `${version}\n`);
  for (const path of jsonVersionFiles) {
    const absolutePath = resolve(root, path);
    const contents = JSON.parse(read(path));
    contents.version = version;
    writeFileSync(absolutePath, `${JSON.stringify(contents, null, 2)}\n`);
  }
}

function releaseCheck({ allowExisting = false } = {}) {
  const version = checkVersionFanout();
  const { tag, version: latestVersion } = latestVersionTag();
  const comparison = compareVersions(version, latestVersion);
  if (comparison < 0 || (comparison === 0 && !allowExisting)) {
    throw new Error(`release version ${version} must be newer than latest tag ${tag}`);
  }
  if (comparison === 0) {
    const taggedCommit = git("rev-parse", `${tag}^{}`);
    const headCommit = git("rev-parse", "HEAD");
    if (taggedCommit !== headCommit) {
      throw new Error(`${tag} points to ${taggedCommit}, not current commit ${headCommit}`);
    }
  }
  console.log(`Release version v${version} is consistent${comparison === 0 ? " and already tagged at HEAD" : ` after ${tag}`}.`);
  return version;
}

const [command, argument] = process.argv.slice(2);
try {
  switch (command) {
    case "check":
      console.log(`Version ${checkVersionFanout()} is consistent.`);
      break;
    case "set":
      if (!argument) throw new Error("Usage: node scripts/version.mjs set <x.y.z>");
      setVersion(argument);
      console.log(`Set release version to ${argument}.`);
      break;
    case "release-check":
      releaseCheck({ allowExisting: process.argv.includes("--allow-existing") });
      break;
    case "notes": {
      const body = changelogSection(canonicalVersion());
      if (!body) throw new Error(`CHANGELOG.md has no section for ${canonicalVersion()}`);
      process.stdout.write(`${body}\n`);
      break;
    }
    default:
      throw new Error("Usage: node scripts/version.mjs <check|set|release-check|notes>");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
