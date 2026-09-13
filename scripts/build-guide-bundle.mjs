#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function buildGuideBundle(outputDirectory, options = {}) {
  const version = readFileSync(resolve(root, "version.txt"), "utf8").trim();
  const registry = JSON.parse(readFileSync(resolve(root, "guide-registry.json"), "utf8"));
  const guideIds = new Set(registry.guides.map((guide) => guide.id));
  if (guideIds.size !== registry.guides.length) throw new Error("guide-registry.json contains duplicate IDs");

  const guides = registry.guides.map((guide) => {
    if (!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(guide.id)) throw new Error(`Invalid guide ID: ${guide.id}`);
    if (!guide.source.startsWith("skills/") || guide.source.includes("..")) {
      throw new Error(`Guide ${guide.id} has an unsafe source path`);
    }
    const content = readFileSync(resolve(root, guide.source), "utf8").replace(/\r\n/g, "\n");
    return {
      id: guide.id,
      version,
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

  const manifest = {
    schema_version: registry.schema_version,
    bundle_version: version,
    compatible_api_versions: registry.compatible_api_versions,
    compatible_runtime_versions: registry.compatible_runtime_versions,
    guides: guides.map(({ content, source, ...guide }) => guide),
  };
  const bundle = { ...manifest, guides };
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
