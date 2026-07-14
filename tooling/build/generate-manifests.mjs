import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPublicationText } from "./publication-artifact-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lock = JSON.parse(await readFile(path.join(root, "sources.lock.json"), "utf8"));
const docsPackage = JSON.parse(await readFile(path.join(root, "packages/docs/package.json"), "utf8"));

async function artifact(relativePath, url, target, { canonicalText = false } = {}) {
  const absolutePath = path.join(root, relativePath);
  const fileBytes = await readFile(absolutePath);
  const bytes = canonicalText ? canonicalPublicationText(fileBytes) : fileBytes;
  return {
    target,
    url,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const sevaraHtml = await artifact(
  "apps/sevara/dist/sevara/spec/foundations/index.html",
  "/sevara/spec/foundations/",
  "html",
);
const sevaraSourceSnapshot = await artifact(
  "apps/sevara/src/generated/authoritative-content.json",
  "src/generated/authoritative-content.json",
  "html",
  { canonicalText: true },
);

const sevara = {
  schemaVersion: 1,
  product: "sevara",
  title: "Sevara",
  basePath: "/sevara/",
  document: {
    id: "sevara",
    namespace: "sevara",
    title: "Sevara",
    lang: "zh-CN",
    canonicalPath: "/sevara/",
  },
  sourceCommit: lock.sources.sevara.commit,
  generatedAt: lock.sources.sevara.committedAt,
  targets: ["html", "pdf"],
  source: lock.sources.sevara,
  sourceSnapshot: {
    path: sevaraSourceSnapshot.url,
    bytes: sevaraSourceSnapshot.bytes,
    sha256: sevaraSourceSnapshot.sha256,
  },
  generator: { docsPackage: docsPackage.version, typst: "0.15.0" },
  authority: {
    normative: "docs/sevara/spec/current.md",
    companion: "docs/sevara/complete_asset/current.typ",
  },
  maturity: "greenfield",
  profiles: ["Surface", "Canonical", "Execution"],
  downloads: {
    overview: await artifact("apps/sevara/public/downloads/sevara-overview.pdf", "/sevara/downloads/sevara-overview.pdf", "pdf"),
    companion: await artifact("apps/sevara/public/downloads/sevara-language-companion.pdf", "/sevara/downloads/sevara-language-companion.pdf", "pdf"),
  },
};
sevara.artifacts = [sevaraHtml, ...Object.values(sevara.downloads)].map((entry) => ({
  target: entry.target,
  path: entry.url,
  bytes: entry.bytes,
  sha256: entry.sha256,
}));

const worldbookSourceSnapshot = await artifact(
  "apps/worldbook/src/generated/authoritative-content.json",
  "src/generated/authoritative-content.json",
  "html",
  { canonicalText: true },
);
const worldbookPublicationIndex = JSON.parse(
  await readFile(path.join(root, "apps/worldbook/src/generated/publication-index.json"), "utf8"),
);
const worldbookContentBundle = JSON.parse(
  await readFile(path.join(root, "apps/worldbook/src/generated/authoritative-content.json"), "utf8"),
);
const worldbookHtml = await Promise.all(worldbookContentBundle.documents.map((document) => artifact(
  `apps/worldbook/dist${document.canonicalPath}index.html`,
  document.canonicalPath,
  "html",
)));
const worldbookPublicationSnapshot = await artifact(
  "apps/worldbook/src/generated/publication-index.json",
  "src/generated/publication-index.json",
  "html",
  { canonicalText: true },
);

const volumeFiles = worldbookPublicationIndex.volumes.map((volume) => [
  volume.number,
  volume.id,
  volume.title,
  volume.englishTitle,
  volume.summary,
  volume.status,
  volume.entry.split("/").at(-1).replace(/\.typ$/, ".pdf"),
]);

const worldbook = {
  schemaVersion: 1,
  product: "worldbook",
  title: worldbookPublicationIndex.title,
  basePath: "/worldbook/",
  document: {
    id: "worldbook",
    namespace: "worldbook",
    title: worldbookPublicationIndex.title,
    lang: "zh-CN",
    canonicalPath: "/worldbook/",
  },
  sourceCommit: lock.sources.worldbook.commit,
  generatedAt: lock.sources.worldbook.committedAt,
  targets: ["html", "pdf"],
  source: lock.sources.worldbook,
  sourceSnapshot: {
    path: worldbookSourceSnapshot.url,
    bytes: worldbookSourceSnapshot.bytes,
    sha256: worldbookSourceSnapshot.sha256,
  },
  publicationIndex: {
    path: worldbookPublicationSnapshot.url,
    bytes: worldbookPublicationSnapshot.bytes,
    sha256: worldbookPublicationSnapshot.sha256,
    source: worldbookPublicationIndex.source,
  },
  generator: { docsPackage: docsPackage.version, typst: "0.15.0" },
  authority: {
    content: "src",
    publication: worldbookPublicationIndex.source.path,
  },
  license: worldbookPublicationIndex.license,
  volumes: await Promise.all(volumeFiles.map(async ([number, slug, title, englishTitle, summary, status, file]) => ({
    number,
    slug,
    title,
    englishTitle,
    summary,
    status,
    artifact: await artifact(`apps/worldbook/public/downloads/${file}`, `/worldbook/downloads/${file}`, "pdf"),
  }))),
};
worldbook.artifacts = [...worldbookHtml, ...worldbook.volumes.map((volume) => volume.artifact)].map((entry) => ({
  target: entry.target,
  path: entry.url,
  bytes: entry.bytes,
  sha256: entry.sha256,
}));

async function writeManifest(value, publicPath, distPath) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path.join(root, publicPath), serialized);
  await mkdir(path.dirname(path.join(root, distPath)), { recursive: true });
  await writeFile(path.join(root, distPath), serialized);
}

await writeManifest(sevara, "apps/sevara/public/publication-manifest.json", "apps/sevara/dist/sevara/publication-manifest.json");
await writeManifest(worldbook, "apps/worldbook/public/publication-manifest.json", "apps/worldbook/dist/worldbook/publication-manifest.json");
process.stdout.write("publication manifests generated\n");
