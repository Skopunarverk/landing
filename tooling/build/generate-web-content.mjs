import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  analyzeTypstDiagnostics,
  auditHtmlFragment,
  decorateHtmlFragment,
  extractHtmlDocument,
  publicHtmlAudit,
  summarizeFontInputs,
  summarizeTypstDependencies,
} from "../../packages/docs/src/schema/authoritative-content.mjs";
import { loadWorldbookPublicationIndex } from "../../packages/docs/src/schema/worldbook-publication.mjs";
import {
  resolveSevaraSource,
  resolveWorldbookSource,
  workspaceRoot,
} from "../content/source-integrity.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256CanonicalText(value) {
  return sha256(Buffer.from(value.toString("utf8").replaceAll("\r\n", "\n"), "utf8"));
}

function typstVersion() {
  return execFileSync("typst", ["--version"], { encoding: "utf8" }).trim();
}

function compile({ root, input, output, dependenciesPath, fontPaths = [], closedFonts = false }) {
  const args = [
    "compile",
    "--root", root,
    "--features", "html",
    "--pretty",
    "--diagnostic-format", "short",
    "--deps", dependenciesPath,
    "--deps-format", "zero",
  ];
  if (closedFonts) args.push("--ignore-system-fonts");
  for (const fontPath of fontPaths) args.push("--font-path", fontPath);
  args.push(input, output);
  const result = spawnSync("typst", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Typst HTML compilation failed with exit code ${result.status}`);
  return result.stderr ?? "";
}

async function renderArtifact(job, version, temporaryRoot) {
  const dependenciesPath = path.join(temporaryRoot, `${job.id}.deps`);
  const stderr = compile({ ...job, dependenciesPath });
  const [sourceBytes, htmlDocument, dependencyBytes] = await Promise.all([
    readFile(job.input),
    readFile(job.output, "utf8"),
    readFile(dependenciesPath),
  ]);
  const extracted = extractHtmlDocument(htmlDocument);
  const decorated = decorateHtmlFragment(extracted.body, {
    namespace: job.outlineNamespace,
    equationLabel: job.equationLabel,
    footnoteTitle: job.footnoteTitle,
    footnoteReferenceLabel: job.footnoteReferenceLabel,
    footnoteBackreferenceLabel: job.footnoteBackreferenceLabel,
  });
  const rendered = { style: extracted.style, body: decorated.body };
  const diagnostics = analyzeTypstDiagnostics(stderr, job.diagnosticPolicy);
  if (diagnostics.blockedCount > 0) {
    const blocked = diagnostics.reported
      .filter(({ code }) => code !== "html-export-experimental")
      .map(({ code, count }) => `${code} (${count})`)
      .join(", ");
    throw new Error(`${job.id}: Typst diagnostics rejected by ${job.diagnosticPolicy}: ${blocked}`);
  }
  const htmlAudit = auditHtmlFragment(rendered.body);
  const htmlErrors = [...htmlAudit.errors];
  if (job.strictSemanticHtml && htmlAudit.emptyFigures > 0) htmlErrors.push(`${htmlAudit.emptyFigures} empty figure(s)`);
  if (job.strictSemanticHtml && htmlAudit.imagesWithoutAlt > 0) htmlErrors.push(`${htmlAudit.imagesWithoutAlt} image(s) without alt text`);
  if (job.strictSemanticHtml && htmlAudit.maxHeadingLevel > 6) htmlErrors.push(`heading level ${htmlAudit.maxHeadingLevel} exceeds h6`);
  if (htmlErrors.length) throw new Error(`${job.id}: generated HTML failed audit:\n- ${htmlErrors.join("\n- ")}`);
  const dependencies = await summarizeTypstDependencies({ zeroBytes: dependencyBytes, sourceRoot: job.root });
  dependencies.fonts = await summarizeFontInputs({
    sourceRoot: job.root,
    fontPaths: job.fontPaths,
    policy: job.fontPolicy,
  });
  return {
    schemaVersion: 3,
    product: job.product,
    canonicalPath: job.canonicalPath,
    source: {
      repository: job.source.repository,
      commit: job.source.commit,
      path: path.relative(job.root, job.input).replaceAll("\\", "/"),
      entrySha256: sha256CanonicalText(sourceBytes),
    },
    generator: { typst: version, docsContract: "@skopunarverk/docs@0.1.0" },
    generatedAt: job.source.committedAt,
    diagnostics,
    dependencies,
    htmlAudit: publicHtmlAudit(htmlAudit),
    outline: decorated.outline,
    style: rendered.style,
    body: rendered.body,
  };
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "skopunarverk-web-content-"));
try {
  const [{ root: sevaraRoot, source: sevaraSource }, { root: worldbookRoot, source: worldbookSource }] =
    await Promise.all([resolveSevaraSource(), resolveWorldbookSource()]);
  const version = typstVersion();
  const sharedLabels = {
    equationLabel: "数学公式；可横向滚动查看完整内容",
    footnoteTitle: "脚注",
    footnoteReferenceLabel: "脚注",
    footnoteBackreferenceLabel: "返回脚注引用",
  };
  const sevaraDestination = path.join(workspaceRoot, "apps/sevara/src/generated/authoritative-content.json");
  const sevaraArtifact = await renderArtifact({
    id: "sevara",
    product: "sevara",
    root: sevaraRoot,
    source: sevaraSource,
    input: path.join(sevaraRoot, "docs/sevara/complete_asset/current.typ"),
    output: path.join(temporaryRoot, "sevara.html"),
    canonicalPath: "/sevara/spec/foundations/",
    fontPaths: [],
    diagnosticPolicy: "sevara-report-v1",
    fontPolicy: "system-allowed",
    strictSemanticHtml: false,
    closedFonts: false,
    outlineNamespace: "sevara",
    ...sharedLabels,
  }, version, temporaryRoot);
  await mkdir(path.dirname(sevaraDestination), { recursive: true });
  await writeFile(sevaraDestination, `${JSON.stringify(sevaraArtifact, null, 2)}\n`);
  process.stdout.write(`sevara: ${sevaraSource.commit} -> ${sevaraArtifact.canonicalPath}\n`);

  const publication = await loadWorldbookPublicationIndex({
    sourceRoot: worldbookRoot,
    repository: worldbookSource.repository,
    commit: worldbookSource.commit,
    expectedMode: worldbookSource.publication?.mode,
  });
  const publishedChapters = publication.volumes.flatMap((volume) =>
    volume.chapters
      .filter((chapter) => chapter.status === "published" && chapter.entry && chapter.webPath)
      .map((chapter) => ({ volume, chapter })),
  );
  if (publishedChapters.length === 0) throw new Error("WorldBook publication index has no published Web chapters");

  const fontPaths = [
    path.join(worldbookRoot, "src/common/assets/fonts/NotoSans"),
    path.join(worldbookRoot, "src/common/assets/fonts/NotoSerif"),
    path.join(worldbookRoot, "src/common/assets/fonts"),
  ];
  const documents = [];
  for (const { volume, chapter } of publishedChapters) {
    const namespace = `worldbook-${volume.id}-${chapter.id}`;
    const artifact = await renderArtifact({
      id: namespace,
      product: "worldbook",
      root: worldbookRoot,
      source: worldbookSource,
      input: path.join(worldbookRoot, ...chapter.entry.split("/")),
      output: path.join(temporaryRoot, `${namespace}.html`),
      canonicalPath: chapter.webPath,
      fontPaths,
      diagnosticPolicy: "worldbook-strict-v1",
      fontPolicy: "repository-only",
      strictSemanticHtml: true,
      closedFonts: true,
      outlineNamespace: namespace,
      ...sharedLabels,
    }, version, temporaryRoot);
    documents.push(artifact);
    process.stdout.write(`worldbook: ${chapter.entry} -> ${chapter.webPath}\n`);
  }
  const worldbookDestination = path.join(workspaceRoot, "apps/worldbook/src/generated/authoritative-content.json");
  const bundle = {
    schemaVersion: 1,
    product: "worldbook",
    source: {
      repository: worldbookSource.repository,
      commit: worldbookSource.commit,
    },
    generatedAt: worldbookSource.committedAt,
    documents,
  };
  await mkdir(path.dirname(worldbookDestination), { recursive: true });
  await writeFile(worldbookDestination, `${JSON.stringify(bundle, null, 2)}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
