import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { workspaceRoot } from "../content/source-integrity.mjs";

const products = {
  sevara: {
    manifest: "apps/sevara/public/publication-manifest.json",
    html: "apps/sevara/dist/sevara/spec/foundations/index.html",
    sourceSnapshot: "apps/sevara/src/generated/authoritative-content.json",
    publicRoot: "apps/sevara/public",
    basePath: "/sevara",
  },
  worldbook: {
    manifest: "apps/worldbook/public/publication-manifest.json",
    html: "apps/worldbook/dist/worldbook/volumes/1-world-basics/magic/index.html",
    sourceSnapshot: "apps/worldbook/src/generated/authoritative-content.json",
    publicRoot: "apps/worldbook/public",
    basePath: "/worldbook",
  },
};

for (const [id, config] of Object.entries(products)) {
  const manifest = JSON.parse(await readFile(path.join(workspaceRoot, config.manifest), "utf8"));
  const snapshotBytes = await readFile(path.join(workspaceRoot, config.sourceSnapshot));
  const snapshotDigest = createHash("sha256").update(snapshotBytes).digest("hex");
  if (manifest.sourceSnapshot?.bytes !== snapshotBytes.length || manifest.sourceSnapshot?.sha256 !== snapshotDigest) {
    throw new Error(`${id}: sourceSnapshot differs from generated authoritative content`);
  }
  for (const artifact of manifest.artifacts) {
    const relative = artifact.target === "html"
      ? config.html
      : path.join(config.publicRoot, artifact.path.slice(config.basePath.length).replace(/^\//, ""));
    const bytes = await readFile(path.join(workspaceRoot, relative));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (artifact.bytes !== bytes.length) throw new Error(`${id}: ${artifact.path} byte count differs from manifest`);
    if (artifact.sha256 !== digest) throw new Error(`${id}: ${artifact.path} checksum differs from manifest`);
  }
  process.stdout.write(`${id}: publication artifact checksums verified\n`);
}
