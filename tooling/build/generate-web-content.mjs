import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  analyzeTypstDiagnostics,
  auditHtmlFragment,
  extractHtmlDocument,
  publicHtmlAudit,
  summarizeFontInputs,
  summarizeTypstDependencies,
} from "../../packages/docs/src/schema/authoritative-content.mjs";
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

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "skopunarverk-web-content-"));
try {
  const [{ root: sevaraRoot, source: sevaraSource }, { root: worldbookRoot, source: worldbookSource }] =
    await Promise.all([resolveSevaraSource(), resolveWorldbookSource()]);
  const version = typstVersion();
  const jobs = [
    {
      id: "sevara",
      root: sevaraRoot,
      source: sevaraSource,
      input: path.join(sevaraRoot, "docs/sevara/complete_asset/current.typ"),
      output: path.join(temporaryRoot, "sevara.html"),
      destination: path.join(workspaceRoot, "apps/sevara/src/generated/authoritative-content.json"),
      canonicalPath: "/sevara/spec/foundations/",
      fontPaths: [],
      diagnosticPolicy: "sevara-report-v1",
      fontPolicy: "system-allowed",
      strictSemanticHtml: false,
      closedFonts: false,
    },
    {
      id: "worldbook",
      root: worldbookRoot,
      source: worldbookSource,
      input: path.join(worldbookRoot, "src/Volume1_WorldBasics/chapters/Chapter1_MagicSystem/chapter1.typ"),
      output: path.join(temporaryRoot, "worldbook.html"),
      destination: path.join(workspaceRoot, "apps/worldbook/src/generated/authoritative-content.json"),
      canonicalPath: "/worldbook/volumes/1-world-basics/magic/",
      fontPaths: [
        path.join(worldbookRoot, "src/common/assets/fonts/NotoSans"),
        path.join(worldbookRoot, "src/common/assets/fonts/NotoSerif"),
        path.join(worldbookRoot, "src/common/assets/fonts"),
      ],
      diagnosticPolicy: "worldbook-strict-v1",
      fontPolicy: "repository-only",
      strictSemanticHtml: true,
      closedFonts: true,
    },
  ];

  for (const job of jobs) {
    const dependenciesPath = path.join(temporaryRoot, `${job.id}.deps`);
    const stderr = compile({ ...job, dependenciesPath });
    const [sourceBytes, htmlDocument, dependencyBytes] = await Promise.all([
      readFile(job.input),
      readFile(job.output, "utf8"),
      readFile(dependenciesPath),
    ]);
    const rendered = extractHtmlDocument(htmlDocument);
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
    const artifact = {
      schemaVersion: 2,
      product: job.id,
      canonicalPath: job.canonicalPath,
      source: {
        repository: job.source.repository,
        commit: job.source.commit,
        path: path.relative(job.root, job.input).replaceAll("\\", "/"),
        entrySha256: sha256CanonicalText(sourceBytes),
      },
      generator: { typst: version, docsContract: "@skopunarverk/docs@0.1.0" },
      // Keep generated artifacts reproducible for a pinned authority commit.
      // The lock's commit timestamp is stable; wall-clock build time is not.
      generatedAt: job.source.committedAt,
      diagnostics,
      dependencies,
      htmlAudit: publicHtmlAudit(htmlAudit),
      style: rendered.style,
      body: rendered.body,
    };
    await mkdir(path.dirname(job.destination), { recursive: true });
    await writeFile(job.destination, `${JSON.stringify(artifact, null, 2)}\n`);
    process.stdout.write(`${job.id}: ${job.source.commit} -> ${job.canonicalPath}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
