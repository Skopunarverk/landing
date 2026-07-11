import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSevaraSource, resolveWorldbookSource } from "./source-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lockPath = path.join(root, "sources.lock.json");
const lockText = await readFile(lockPath, "utf8");
const lock = JSON.parse(lockText);

for (const [id, source] of Object.entries(lock.sources)) {
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(source.repository)) {
    throw new Error(`${id} repository must be an explicit GitHub HTTPS URL`);
  }
  if (!/^[a-f0-9]{40}$/.test(source.commit)) throw new Error(`${id} commit must be a full SHA`);
  if (typeof source.committedAt !== "string" || Number.isNaN(Date.parse(source.committedAt))) {
    throw new Error(`${id} committedAt must be an ISO date-time`);
  }
}

const digest = createHash("sha256").update(lockText).digest("hex");
process.stdout.write(`sources.lock.json sha256=${digest}\n`);

if (process.argv.includes("--checkouts")) {
  const [sevara, worldbook] = await Promise.all([resolveSevaraSource(), resolveWorldbookSource()]);
  process.stdout.write(`sevara checkout=${sevara.source.commit}\n`);
  process.stdout.write(`worldbook checkout=${worldbook.source.commit}\n`);
}
