#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicationMeta } from "../schema/publication.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

async function filesUnder(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(root, path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

async function fingerprint(root) {
  const records = [];
  for (const file of await filesUnder(root)) {
    const bytes = await readFile(file);
    records.push({
      path: relative(root, file).replaceAll("\\", "/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    });
  }
  return records;
}

async function prepare(args) {
  const output = resolve(option(args, "--out", ".skopunarverk/typst"));
  const source = join(packageRoot, "typst");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  const files = await fingerprint(output);
  const manifest = {
    schemaVersion: 1,
    package: packageJson.name,
    version: packageJson.version,
    files,
  };
  await writeFile(join(output, "staging-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${output}\n`);
}

async function validate(args) {
  const input = args[0];
  if (!input) throw new Error("validate requires a publication-manifest JSON path");
  const value = JSON.parse(await readFile(resolve(input), "utf8"));
  const errors = validatePublicationMeta(value);
  if (errors.length > 0) throw new Error(`Invalid publication manifest:\n- ${errors.join("\n- ")}`);
  process.stdout.write("valid\n");
}

async function manifest(args) {
  const output = resolve(option(args, "--out", "skopunarverk-docs-manifest.json"));
  await mkdir(dirname(output), { recursive: true });
  const value = {
    schemaVersion: 1,
    package: packageJson.name,
    version: packageJson.version,
    typst: await fingerprint(join(packageRoot, "typst")),
  };
  await writeFile(output, `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`${output}\n`);
}

function usage() {
  process.stderr.write("Usage: skopunarverk-docs <prepare|validate|manifest> [options]\n");
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "prepare") await prepare(args);
  else if (command === "validate") await validate(args);
  else if (command === "manifest") await manifest(args);
  else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
