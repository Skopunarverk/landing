import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  auditGeneratedCss,
  auditHtmlFragment,
  decorateHtmlFragment,
  publicHtmlAudit,
  validateDiagnosticSummary,
  validateDependencySummary,
  validateDocumentOutline,
} from "../../packages/docs/src/schema/authoritative-content.mjs";
import { readSourcesLock, workspaceRoot } from "../content/source-integrity.mjs";

const lock = await readSourcesLock();

function validateArtifact(value, { id, canonicalPath, sourcePath, namespace, committedAt }) {
  const errors = [];
  if (value.schemaVersion !== 3) errors.push("schemaVersion must be 3");
  if (value.product !== id) errors.push(`product must be ${id}`);
  if (value.canonicalPath !== canonicalPath) errors.push(`canonicalPath must be ${canonicalPath}`);
  if (value.source?.repository !== lock.sources[id].repository) errors.push("source repository differs from sources.lock.json");
  if (value.source?.commit !== lock.sources[id].commit) errors.push("source commit differs from sources.lock.json");
  if (value.source?.path !== sourcePath) errors.push(`source path must be ${sourcePath}`);
  if (!/^[a-f0-9]{64}$/.test(value.source?.entrySha256 ?? "")) errors.push("entrySha256 is invalid");
  if (typeof value.body !== "string" || value.body.length < 1000) errors.push("rendered body is missing or unexpectedly small");
  if (Number.isNaN(Date.parse(value.generatedAt))) errors.push("generatedAt is invalid");
  if (value.generatedAt !== committedAt) errors.push("generatedAt differs from sources.lock.json");
  errors.push(...auditGeneratedCss(value.style));
  errors.push(...validateDependencySummary(value.dependencies, {
    fontPolicy: id === "worldbook" ? "repository-only" : "system-allowed",
    requireFonts: id === "worldbook",
  }));
  const entryDependency = value.dependencies?.inputs?.find((entry) => entry.path === `source/${sourcePath}`);
  if (!entryDependency) errors.push("dependencies.inputs does not contain the source entry");
  else if (entryDependency.sha256 !== value.source?.entrySha256) errors.push("entrySha256 differs from the source dependency digest");

  const expectedPolicy = id === "worldbook" ? "worldbook-strict-v1" : "sevara-report-v1";
  errors.push(...validateDiagnosticSummary(value.diagnostics, expectedPolicy));
  if (value.diagnostics?.blockedCount !== 0) errors.push("diagnostics.blockedCount must be zero");

  if (typeof value.body === "string") {
    const decorated = decorateHtmlFragment(value.body, {
      namespace,
      equationLabel: "数学公式；可横向滚动查看完整内容",
      footnoteTitle: "脚注",
      footnoteReferenceLabel: "脚注",
      footnoteBackreferenceLabel: "返回脚注引用",
    });
    errors.push(...validateDocumentOutline(value.outline, { namespace }));
    if (decorated.body !== value.body) errors.push("rendered body is not normalized with heading anchors and equation wrappers");
    if (JSON.stringify(decorated.outline) !== JSON.stringify(value.outline)) errors.push("outline does not match rendered body");
    const audited = auditHtmlFragment(value.body);
    if (audited.errors.length) errors.push(...audited.errors.map((error) => `HTML audit: ${error}`));
    if (JSON.stringify(publicHtmlAudit(audited)) !== JSON.stringify(value.htmlAudit)) errors.push("htmlAudit does not match rendered body");
    if (audited.parseErrors > 0) errors.push("rendered body has parser errors");
    if (audited.unsafeElements + audited.unsafeAttributes + audited.unsafeUrls > 0) errors.push("rendered body contains unsafe markup");
    if (id === "worldbook" && audited.emptyFigures > 0) errors.push("WorldBook rendered body contains empty figures");
    if (id === "worldbook" && audited.imagesWithoutAlt > 0) errors.push("WorldBook rendered body contains images without alt text");
    if (id === "worldbook" && audited.maxHeadingLevel > 6) errors.push("WorldBook rendered body exceeds heading level 6");
  }
  return errors;
}

const sevaraPath = "apps/sevara/src/generated/authoritative-content.json";
const sevara = JSON.parse(await readFile(path.join(workspaceRoot, sevaraPath), "utf8"));
const sevaraErrors = validateArtifact(sevara, {
  id: "sevara",
  canonicalPath: "/sevara/spec/foundations/",
  sourcePath: "docs/sevara/complete_asset/current.typ",
  namespace: "sevara",
  committedAt: lock.sources.sevara.committedAt,
});
if (sevaraErrors.length) throw new Error(`${sevaraPath}:\n- ${sevaraErrors.join("\n- ")}`);
process.stdout.write(`sevara: generated content matches ${sevara.source.commit}\n`);

const worldbookPath = "apps/worldbook/src/generated/authoritative-content.json";
const publicationPath = "apps/worldbook/src/generated/publication-index.json";
const [bundle, publication] = await Promise.all([
  readFile(path.join(workspaceRoot, worldbookPath), "utf8").then(JSON.parse),
  readFile(path.join(workspaceRoot, publicationPath), "utf8").then(JSON.parse),
]);
const bundleErrors = [];
if (bundle.schemaVersion !== 1) bundleErrors.push("schemaVersion must be 1");
if (bundle.product !== "worldbook") bundleErrors.push("product must be worldbook");
if (bundle.source?.repository !== lock.sources.worldbook.repository) bundleErrors.push("source repository differs from sources.lock.json");
if (bundle.source?.commit !== lock.sources.worldbook.commit) bundleErrors.push("source commit differs from sources.lock.json");
if (bundle.generatedAt !== lock.sources.worldbook.committedAt) bundleErrors.push("generatedAt differs from sources.lock.json");
if (!Array.isArray(bundle.documents)) bundleErrors.push("documents must be an array");

const published = publication.volumes.flatMap((volume) =>
  volume.chapters
    .filter((chapter) => chapter.status === "published" && chapter.entry && chapter.webPath)
    .map((chapter) => ({ volume, chapter })),
);
const documents = Array.isArray(bundle.documents) ? bundle.documents : [];
const sourcePaths = documents.map((document) => document.source?.path);
const canonicalPaths = documents.map((document) => document.canonicalPath);
if (new Set(sourcePaths).size !== sourcePaths.length) bundleErrors.push("documents contain duplicate source paths");
if (new Set(canonicalPaths).size !== canonicalPaths.length) bundleErrors.push("documents contain duplicate canonical paths");
if (documents.length !== published.length) bundleErrors.push("documents must match published chapters one-to-one");

for (const { volume, chapter } of published) {
  const document = documents.find((candidate) => candidate.source?.path === chapter.entry);
  if (!document) {
    bundleErrors.push(`missing document for ${chapter.entry}`);
    continue;
  }
  const errors = validateArtifact(document, {
    id: "worldbook",
    canonicalPath: chapter.webPath,
    sourcePath: chapter.entry,
    namespace: `worldbook-${volume.id}-${chapter.id}`,
    committedAt: lock.sources.worldbook.committedAt,
  });
  bundleErrors.push(...errors.map((error) => `${chapter.entry}: ${error}`));
}
for (const document of documents) {
  if (!published.some(({ chapter }) => chapter.entry === document.source?.path)) {
    bundleErrors.push(`undeclared document ${document.source?.path ?? "<missing source path>"}`);
  }
}
if (bundleErrors.length) throw new Error(`${worldbookPath}:\n- ${bundleErrors.join("\n- ")}`);
process.stdout.write(`worldbook: ${documents.length} generated chapter(s) match ${bundle.source.commit}\n`);
