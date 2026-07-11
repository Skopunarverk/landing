import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lock = JSON.parse(await readFile(path.join(root, "sources.lock.json"), "utf8"));
const docsPackage = JSON.parse(await readFile(path.join(root, "packages/docs/package.json"), "utf8"));

async function artifact(relativePath, url, target) {
  const absolutePath = path.join(root, relativePath);
  const bytes = await readFile(absolutePath);
  return {
    target,
    url,
    bytes: (await stat(absolutePath)).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const generatedAt = new Date().toISOString();
const sevaraHtml = await artifact(
  "apps/sevara/dist/sevara/spec/foundations/index.html",
  "/sevara/spec/foundations/",
  "html",
);
const sevaraSourceSnapshot = await artifact(
  "apps/sevara/src/generated/authoritative-content.json",
  "src/generated/authoritative-content.json",
  "html",
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
  generatedAt,
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

const worldbookHtml = await artifact(
  "apps/worldbook/dist/worldbook/volumes/1-world-basics/magic/index.html",
  "/worldbook/volumes/1-world-basics/magic/",
  "html",
);
const worldbookSourceSnapshot = await artifact(
  "apps/worldbook/src/generated/authoritative-content.json",
  "src/generated/authoritative-content.json",
  "html",
);

const volumeFiles = [
  [1, "world-basics", "世界基础", "Volume1_WorldBasics.pdf"],
  [2, "history-and-social-evolution", "历史与社会演变", "Volume2_HistoryAndSocialEvolution.pdf"],
  [3, "culture-and-civilization", "文化与文明", "Volume3_CultureAndCivilization.pdf"],
  [4, "social-life-and-challenges", "社会生活与挑战", "Volume4_SocialLifeAndChallenge.pdf"],
];

const worldbook = {
  schemaVersion: 1,
  product: "worldbook",
  title: "The World Book",
  basePath: "/worldbook/",
  document: {
    id: "worldbook",
    namespace: "worldbook",
    title: "The World Book",
    lang: "zh-CN",
    canonicalPath: "/worldbook/",
  },
  sourceCommit: lock.sources.worldbook.commit,
  generatedAt,
  targets: ["html", "pdf"],
  source: lock.sources.worldbook,
  sourceSnapshot: {
    path: worldbookSourceSnapshot.url,
    bytes: worldbookSourceSnapshot.bytes,
    sha256: worldbookSourceSnapshot.sha256,
  },
  generator: { docsPackage: docsPackage.version, typst: "0.15.0" },
  authority: "src",
  license: "CC BY-NC-SA 4.0",
  volumes: await Promise.all(volumeFiles.map(async ([number, slug, title, file]) => ({
    number,
    slug,
    title,
    artifact: await artifact(`apps/worldbook/public/downloads/${file}`, `/worldbook/downloads/${file}`, "pdf"),
  }))),
};
worldbook.artifacts = [worldbookHtml, ...worldbook.volumes.map((volume) => volume.artifact)].map((entry) => ({
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
