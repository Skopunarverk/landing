import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadWorldbookPublicationIndex } from "../../packages/docs/src/schema/worldbook-publication.mjs";
import { resolveWorldbookSource, workspaceRoot } from "../content/source-integrity.mjs";

const { root, source } = await resolveWorldbookSource();
const destination = path.join(workspaceRoot, "apps/worldbook/src/generated/publication-index.json");
const authoritativeContentPath = path.join(workspaceRoot, "apps/worldbook/src/generated/authoritative-content.json");
const index = await loadWorldbookPublicationIndex({
  sourceRoot: root,
  repository: source.repository,
  commit: source.commit,
  expectedMode: source.publication?.mode,
});
const expectedPublication = source.publication;
if (!expectedPublication) throw new Error("sources.lock.json must declare the expected WorldBook publication source");
if (
  index.source.mode !== expectedPublication.mode
  || index.source.path !== expectedPublication.path
  || index.source.sha256 !== expectedPublication.sha256
) {
  throw new Error(
    `WorldBook publication source ${index.source.mode}:${index.source.path}:${index.source.sha256} differs from sources.lock.json`,
  );
}

const authoritativeContent = JSON.parse(await readFile(authoritativeContentPath, "utf8"));
if (
  authoritativeContent.source?.repository !== source.repository
  || authoritativeContent.source?.commit !== source.commit
) {
  throw new Error("WorldBook authoritative HTML provenance differs from the pinned publication source");
}

const webChapter = index.volumes
  .flatMap((volume) => volume.chapters)
  .find((chapter) => chapter.entry === authoritativeContent.source.path);
if (!webChapter) {
  throw new Error(`No publication chapter matches generated HTML source ${authoritativeContent.source.path}`);
}
if (index.source.mode === "legacy-readme") {
  webChapter.status = "published";
  webChapter.webPath = authoritativeContent.canonicalPath;
} else if (
  webChapter.status !== "published"
  || webChapter.webPath !== authoritativeContent.canonicalPath
) {
  throw new Error("Structured publication metadata disagrees with the generated WorldBook HTML route");
}

const serialized = `${JSON.stringify(index, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(destination, "utf8");
  if (current !== serialized) {
    throw new Error("WorldBook publication index differs from the pinned authority; run worldbook-publication:generate");
  }
} else {
  await writeFile(destination, serialized);
}

process.stdout.write(
  `worldbook publication: ${index.source.mode} ${index.source.commit} ${index.source.path}${process.argv.includes("--check") ? " verified" : ` -> ${destination}`}\n`,
);
