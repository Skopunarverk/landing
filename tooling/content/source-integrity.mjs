import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export async function readSourcesLock() {
  return JSON.parse(await readFile(path.join(workspaceRoot, "sources.lock.json"), "utf8"));
}

export async function resolvePinnedSource({ id, envVar, adjacentDirectory, marker }) {
  const lock = await readSourcesLock();
  const source = lock.sources[id];
  if (!source) throw new Error(`sources.lock.json does not define ${id}`);

  const candidates = [
    process.env[envVar],
    path.join(workspaceRoot, ".sources", id),
    path.resolve(workspaceRoot, "..", adjacentDirectory),
  ].filter(Boolean);
  const root = candidates.find((candidate) => existsSync(path.join(candidate, marker)));
  if (!root) throw new Error(`${id}: no source checkout contains ${marker}; checked ${candidates.join(", ")}`);

  let remote;
  let head;
  let dirty;
  try {
    remote = git(root, "remote", "get-url", "origin");
    head = git(root, "rev-parse", "HEAD");
    dirty = git(root, "status", "--porcelain");
  } catch (error) {
    throw new Error(`${id}: ${root} must be a Git checkout of the pinned authority`, { cause: error });
  }
  if (remote !== source.repository) throw new Error(`${id}: origin ${remote} does not match ${source.repository}`);
  if (head !== source.commit) throw new Error(`${id}: HEAD ${head} does not match pinned commit ${source.commit}`);
  if (dirty) throw new Error(`${id}: pinned source checkout is dirty; refusing to publish ambiguous artifacts`);

  return { root, source };
}

export async function resolveSevaraSource() {
  return resolvePinnedSource({
    id: "sevara",
    envVar: "SKOPUNARVERK_SEVARA_SOURCE",
    adjacentDirectory: "sevara",
    marker: "docs/sevara/complete_asset/current.typ",
  });
}

export async function resolveWorldbookSource() {
  return resolvePinnedSource({
    id: "worldbook",
    envVar: "SKOPUNARVERK_WORLDBOOK_SOURCE",
    adjacentDirectory: "TheWorldBook",
    marker: "src/Volume1_WorldBasics/Volume1_WorldBasics.typ",
  });
}
