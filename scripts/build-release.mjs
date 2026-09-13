#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGuideBundle } from "./build-guide-bundle.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(process.argv[2] ?? join(root, "dist"));
const version = readFileSync(join(root, "version.txt"), "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid version.txt: ${version}`);
if (outputDirectory === root) throw new Error("Refusing to use the repository root as the artifact directory");

const sha =
  process.env.RELEASE_SHA ??
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceEpoch = Number(execFileSync("git", ["show", "-s", "--format=%ct", sha], { cwd: root, encoding: "utf8" }).trim());
const normalizedTime = new Date(Math.max(sourceEpoch, 315532800) * 1000);
const temporaryRoot = mkdtempSync(join(tmpdir(), "locus-release-"));

const pluginPaths = [
  ".agents",
  ".claude-plugin",
  ".codex-plugin",
  ".cursor-plugin",
  ".grok-plugin",
  ".mcp.json",
  "AGENTS.md",
  "LICENSE",
  "README.md",
  "agents",
  "assets",
  "glama.json",
  "mcp.json",
  "plugin.json",
  "server.json",
  "skills",
  "version.txt",
];

function copyPath(sourceRelative, destinationRoot, destinationRelative = sourceRelative) {
  const source = join(root, sourceRelative);
  if (!existsSync(source)) throw new Error(`Release input does not exist: ${sourceRelative}`);
  const destination = join(destinationRoot, destinationRelative);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function walk(directory) {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...walk(absolute));
    else if (entry.isFile()) paths.push(absolute);
  }
  return paths;
}

function normalize(directory) {
  for (const path of walk(directory)) {
    chmodSync(path, 0o644);
    utimesSync(path, normalizedTime, normalizedTime);
  }
}

function createZip(stagingDirectory, outputName) {
  normalize(stagingDirectory);
  const output = join(outputDirectory, outputName);
  rmSync(output, { force: true });
  const files = walk(stagingDirectory).map((path) => relative(stagingDirectory, path));
  const result = spawnSync("zip", ["-X", "-q", output, ...files], {
    cwd: stagingDirectory,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`zip failed for ${outputName}: ${result.stderr}`);
  return output;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

mkdirSync(outputDirectory, { recursive: true });
const artifacts = [];

try {
  const pluginStage = join(temporaryRoot, "plugin");
  mkdirSync(pluginStage);
  for (const path of pluginPaths) copyPath(path, pluginStage);
  artifacts.push(createZip(pluginStage, `locus-plugin-v${version}.zip`));

  const skills = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
  for (const skill of skills) {
    const skillStage = join(temporaryRoot, skill);
    mkdirSync(skillStage);
    copyPath(`skills/${skill}/SKILL.md`, skillStage, "SKILL.md");
    if (existsSync(join(root, `skills/${skill}/references`))) {
      copyPath(`skills/${skill}/references`, skillStage, "references");
    }
    if (existsSync(join(root, `skills/${skill}/assets`))) {
      copyPath(`skills/${skill}/assets`, skillStage, "assets");
    }
    artifacts.push(createZip(skillStage, `${skill}-v${version}.zip`));
  }

  const artifactDigests = Object.fromEntries(artifacts.map((path) => [basename(path), sha256(path)]));
  const releaseBase = `https://github.com/locus-technologies/locus-pro-plugin/releases/download/v${version}`;
  const skillIndex = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: skills.map((name) => {
      const source = readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
      const description = source.match(/^description:\s*(.+)$/m)?.[1]?.trim();
      if (!description) throw new Error(`skills/${name}/SKILL.md is missing a description`);
      return {
        name,
        type: "archive",
        description,
        url: `${releaseBase}/${name}-v${version}.zip`,
        digest: `sha256:${artifactDigests[`${name}-v${version}.zip`]}`,
      };
    }),
  };
  const indexPath = join(outputDirectory, "agent-skills-index.json");
  writeFileSync(indexPath, `${JSON.stringify(skillIndex, null, 2)}\n`);
  artifacts.push(indexPath);

  const guideBundle = buildGuideBundle(outputDirectory);
  artifacts.push(guideBundle.manifestPath, guideBundle.bundlePath);

  const manifestPath = join(outputDirectory, "release-manifest.json");
  const releaseManifest = {
    version,
    tag: `v${version}`,
    commit: sha,
    artifacts: Object.fromEntries(artifacts.map((path) => [basename(path), `sha256:${sha256(path)}`])),
  };
  writeFileSync(manifestPath, `${JSON.stringify(releaseManifest, null, 2)}\n`);
  artifacts.push(manifestPath);

  const checksums = artifacts
    .map((path) => `${sha256(path)}  ${basename(path)}`)
    .sort()
    .join("\n");
  writeFileSync(join(outputDirectory, "CHECKSUMS.sha256"), `${checksums}\n`);

  console.log(`Built release v${version} for ${sha}:`);
  for (const path of [...artifacts, join(outputDirectory, "CHECKSUMS.sha256")]) {
    console.log(`- ${path}`);
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
