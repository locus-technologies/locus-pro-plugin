#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function buildGuideBundle(outputDirectory, options = {}) {
  const version = readFileSync(resolve(root, "version.txt"), "utf8").trim();
  const environment = options.environment ?? "production";
  if (!["production", "stage", "beta", "development"].includes(environment)) {
    throw new Error(`Invalid guide environment: ${environment}`);
  }
  const registry = JSON.parse(readFileSync(resolve(root, "guide-registry.json"), "utf8"));
  const guideIds = new Set(registry.guides.map((guide) => guide.id));
  if (guideIds.size !== registry.guides.length) throw new Error("guide-registry.json contains duplicate IDs");

  const guides = registry.guides.map((guide) => {
    if (!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(guide.id)) throw new Error(`Invalid guide ID: ${guide.id}`);
    if (!guide.source.startsWith("skills/") || guide.source.includes("..")) {
      throw new Error(`Guide ${guide.id} has an unsafe source path`);
    }
    const sourceMatch = /^skills\/([a-z0-9][a-z0-9-]*)\/(.+)$/.exec(guide.source);
    if (!sourceMatch) throw new Error(`Guide ${guide.id} is not inside a skill tree`);
    const [, skill, installPath] = sourceMatch;
    if (
      !installPath ||
      installPath.startsWith("/") ||
      installPath.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new Error(`Guide ${guide.id} has an unsafe install path`);
    }
    const content = readFileSync(resolve(root, guide.source), "utf8").replace(/\r\n/g, "\n");
    return {
      id: guide.id,
      version,
      skill,
      install_path: installPath,
      entrypoint: installPath === "SKILL.md",
      title: guide.title,
      activation: guide.activation,
      content_type: guide.content_type ?? "text/markdown",
      source: guide.source,
      sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      content,
      resources: [],
    };
  });

  const bySource = new Map(guides.map((guide) => [guide.source, guide]));
  for (const guide of guides) {
    const sourceDirectory = dirname(guide.source);
    const links = [...guide.content.matchAll(/\]\(([^)]+)\)/g)]
      .map((match) => match[1].split("#")[0].split("?")[0])
      .filter((link) => link && !/^(?:[a-z]+:|\/|#)/i.test(link));
    guide.resources = [...new Set(links)].map((link) => {
      const resolvedSource = resolve(root, sourceDirectory, link).slice(root.length + 1);
      const resource = bySource.get(resolvedSource);
      if (!resource) throw new Error(`${guide.source}: Markdown reference ${link} is not in guide-registry.json`);
      return { id: resource.id, title: resource.title };
    });
  }

  const publishedGuides = guides.map(({ source: _source, ...guide }) => guide);
  const manifest = {
    schema_version: registry.schema_version,
    bundle_version: version,
    environment,
    compatible_api_versions: registry.compatible_api_versions,
    compatible_runtime_versions: registry.compatible_runtime_versions,
    guides: publishedGuides.map(({ content, ...guide }) => guide),
  };
  const entrypoints = new Map();
  const installTargets = new Set();
  for (const guide of guides) {
    const target = `${guide.skill}/${guide.install_path}`;
    if (installTargets.has(target)) throw new Error(`Duplicate guide install target: ${target}`);
    installTargets.add(target);
    if (guide.entrypoint) entrypoints.set(guide.skill, (entrypoints.get(guide.skill) ?? 0) + 1);
  }
  for (const skill of new Set(guides.map((guide) => guide.skill))) {
    if (entrypoints.get(skill) !== 1) throw new Error(`Skill ${skill} must have exactly one SKILL.md entrypoint`);
  }

  const bundle = { ...manifest, guides: publishedGuides };
  const bundleBytes = `${JSON.stringify(bundle)}\n`;
  const digest = createHash("sha256").update(bundleBytes).digest("hex");
  const releaseManifest = { ...manifest, bundle_sha256: digest };

  mkdirSync(outputDirectory, { recursive: true });
  const manifestPath = resolve(outputDirectory, `locus-guide-manifest-v${version}.json`);
  const bundlePath = resolve(outputDirectory, `locus-guide-bundle-v${version}.json`);
  writeFileSync(manifestPath, `${JSON.stringify(releaseManifest, null, 2)}\n`);
  writeFileSync(bundlePath, bundleBytes);
  if (options.latestPointer) {
    writeFileSync(
      resolve(outputDirectory, "locus-guide-manifest.json"),
      `${JSON.stringify(releaseManifest, null, 2)}\n`,
    );
    writeFileSync(resolve(outputDirectory, "locus-guide-bundle.json"), bundleBytes);
  }
  return { manifestPath, bundlePath, bundleSha256: digest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] ?? resolve(root, "dist"));
  const result = buildGuideBundle(output, { latestPointer: true });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
