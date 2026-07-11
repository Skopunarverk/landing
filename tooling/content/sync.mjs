import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcesRoot = path.join(root, ".sources");
const lock = JSON.parse(await readFile(path.join(root, "sources.lock.json"), "utf8"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}${detail}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

await mkdir(sourcesRoot, { recursive: true });

for (const [id, source] of Object.entries(lock.sources)) {
  if (!/^[a-f0-9]{40}$/.test(source.commit)) throw new Error(`${id} has an invalid pinned commit`);
  const target = path.resolve(sourcesRoot, id);
  if (!target.startsWith(`${path.resolve(sourcesRoot)}${path.sep}`)) throw new Error(`Unsafe source target: ${target}`);

  try {
    const currentRemote = run("git", ["remote", "get-url", "origin"], { cwd: target, capture: true });
    if (currentRemote !== source.repository) throw new Error(`${id} origin mismatch: ${currentRemote}`);
    const dirty = run("git", ["status", "--porcelain"], { cwd: target, capture: true });
    if (dirty) throw new Error(`${id} checkout is dirty; refusing to replace local source changes`);
  } catch (error) {
    if (error.message.includes("origin mismatch") || error.message.includes("dirty")) throw error;
    run("git", ["clone", "--filter=blob:none", "--no-checkout", source.repository, target]);
  }

  run("git", ["fetch", "--depth", "1", "origin", source.commit], { cwd: target });
  run("git", ["checkout", "--detach", source.commit], { cwd: target });
  const resolved = run("git", ["rev-parse", "HEAD"], { cwd: target, capture: true });
  if (resolved !== source.commit) throw new Error(`${id} resolved to ${resolved}, expected ${source.commit}`);
  process.stdout.write(`${id}: ${resolved}\n`);
}
