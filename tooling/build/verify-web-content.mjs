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
const artifacts = [
  ["sevara", "apps/sevara/src/generated/authoritative-content.json", "/sevara/spec/foundations/", "docs/sevara/complete_asset/current.typ"],
  ["worldbook", "apps/worldbook/src/generated/authoritative-content.json", "/worldbook/volumes/1-world-basics/magic/", "src/Volume1_WorldBasics/chapters/Chapter1_MagicSystem/chapter1.typ"],
];

for (const [id, relativePath, canonicalPath, sourcePath] of artifacts) {
  const value = JSON.parse(await readFile(path.join(workspaceRoot, relativePath), "utf8"));
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
  if (value.generatedAt !== lock.sources[id].committedAt) errors.push("generatedAt differs from sources.lock.json");
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
      namespace: id,
      equationLabel: "数学公式；可横向滚动查看完整内容",
      footnoteTitle: "脚注",
      footnoteReferenceLabel: "脚注",
      footnoteBackreferenceLabel: "返回脚注引用",
    });
    errors.push(...validateDocumentOutline(value.outline, { namespace: id }));
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
  if (errors.length) throw new Error(`${relativePath}:\n- ${errors.join("\n- ")}`);
  process.stdout.write(`${id}: generated content matches ${value.source.commit}\n`);
}
