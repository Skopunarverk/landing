import { readFile } from "node:fs/promises";
import path from "node:path";
import { readSourcesLock, workspaceRoot } from "../content/source-integrity.mjs";

const lock = await readSourcesLock();
const artifacts = [
  ["sevara", "apps/sevara/src/generated/authoritative-content.json", "/sevara/spec/foundations/"],
  ["worldbook", "apps/worldbook/src/generated/authoritative-content.json", "/worldbook/volumes/1-world-basics/magic/"],
];

for (const [id, relativePath, canonicalPath] of artifacts) {
  const value = JSON.parse(await readFile(path.join(workspaceRoot, relativePath), "utf8"));
  const errors = [];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.product !== id) errors.push(`product must be ${id}`);
  if (value.canonicalPath !== canonicalPath) errors.push(`canonicalPath must be ${canonicalPath}`);
  if (value.source?.repository !== lock.sources[id].repository) errors.push("source repository differs from sources.lock.json");
  if (value.source?.commit !== lock.sources[id].commit) errors.push("source commit differs from sources.lock.json");
  if (!/^[a-f0-9]{64}$/.test(value.source?.entrySha256 ?? "")) errors.push("entrySha256 is invalid");
  if (typeof value.body !== "string" || value.body.length < 1000) errors.push("rendered body is missing or unexpectedly small");
  if (Number.isNaN(Date.parse(value.generatedAt))) errors.push("generatedAt is invalid");
  if (errors.length) throw new Error(`${relativePath}:\n- ${errors.join("\n- ")}`);
  process.stdout.write(`${id}: generated content matches ${value.source.commit}\n`);
}
