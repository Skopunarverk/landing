import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readSourcesLock, workspaceRoot } from "../content/source-integrity.mjs";
import { assertWorldbookManifestCoverage } from "./publication-artifact-contract.mjs";

const products = {
  sevara: {
    manifest: "apps/sevara/public/publication-manifest.json",
    sourceSnapshot: "apps/sevara/src/generated/authoritative-content.json",
    publicRoot: "apps/sevara/public",
    basePath: "/sevara",
  },
  worldbook: {
    manifest: "apps/worldbook/public/publication-manifest.json",
    sourceSnapshot: "apps/worldbook/src/generated/authoritative-content.json",
    publicationIndex: "apps/worldbook/src/generated/publication-index.json",
    publicRoot: "apps/worldbook/public",
    basePath: "/worldbook",
  },
};

const lock = await readSourcesLock();

for (const [id, config] of Object.entries(products)) {
  const manifest = JSON.parse(await readFile(path.join(workspaceRoot, config.manifest), "utf8"));
  const snapshotBytes = await readFile(path.join(workspaceRoot, config.sourceSnapshot));
  const snapshotDigest = createHash("sha256").update(snapshotBytes).digest("hex");
  if (manifest.sourceSnapshot?.bytes !== snapshotBytes.length || manifest.sourceSnapshot?.sha256 !== snapshotDigest) {
    throw new Error(`${id}: sourceSnapshot differs from generated authoritative content`);
  }
  if (config.publicationIndex) {
    const publicationBytes = await readFile(path.join(workspaceRoot, config.publicationIndex));
    const publicationDigest = createHash("sha256").update(publicationBytes).digest("hex");
    if (
      manifest.publicationIndex?.bytes !== publicationBytes.length
      || manifest.publicationIndex?.sha256 !== publicationDigest
    ) {
      throw new Error(`${id}: publicationIndex differs from generated authority metadata`);
    }
    if (id === "worldbook") {
      assertWorldbookManifestCoverage({
        manifest,
        bundle: JSON.parse(snapshotBytes.toString("utf8")),
        publicationIndex: JSON.parse(publicationBytes.toString("utf8")),
        lockSource: lock.sources.worldbook,
      });
    }
  }
  for (const artifact of manifest.artifacts) {
    const relative = artifact.target === "html"
      ? `apps/${id}/dist${artifact.path}index.html`
      : path.join(config.publicRoot, artifact.path.slice(config.basePath.length).replace(/^\//, ""));
    const bytes = await readFile(path.join(workspaceRoot, relative));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (artifact.bytes !== bytes.length) throw new Error(`${id}: ${artifact.path} byte count differs from manifest`);
    if (artifact.sha256 !== digest) throw new Error(`${id}: ${artifact.path} checksum differs from manifest`);
  }
  process.stdout.write(`${id}: publication artifact checksums verified\n`);
}
