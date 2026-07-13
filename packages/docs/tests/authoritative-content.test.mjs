import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  analyzeTypstDiagnostics,
  auditGeneratedCss,
  auditHtmlFragment,
  extractHtmlDocument,
  summarizeFontInputs,
  summarizeTypstDependencies,
  validateDiagnosticSummary,
  validateDependencySummary,
} from "../src/schema/authoritative-content.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

test("Typst HTML is parsed structurally and records semantic counters", () => {
  const document = `<!doctype html><html><head><style>svg { max-width: 100%; }</style></head><body>
    <article><h1>Magic</h1><figure><svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg><figcaption>Flow</figcaption></figure><math><mi>x</mi></math></article>
  </body></html>`;
  const rendered = extractHtmlDocument(document);
  const audit = auditHtmlFragment(rendered.body);

  assert.match(rendered.style, /max-width/);
  assert.match(rendered.style, /\.sk-docs-rendered svg/);
  assert.equal(audit.parseErrors, 0);
  assert.equal(audit.figures, 1);
  assert.equal(audit.emptyFigures, 0);
  assert.equal(audit.inlineSvgs, 1);
  assert.equal(audit.math, 1);
  assert.equal(audit.maxHeadingLevel, 1);
  assert.deepEqual(audit.errors, []);
});

test("empty figures and extended aria heading levels remain observable", () => {
  const audit = auditHtmlFragment('<figure><div>Only a caption-shaped string</div></figure><figure><div role="img" aria-label="Missing diagram"></div><figcaption>Missing visual</figcaption></figure><figure><svg></svg></figure><img src="data:image/png;base64,AA=="><div role="heading" aria-level="7">Deep</div>');
  assert.equal(audit.emptyFigures, 3);
  assert.equal(audit.imagesWithoutAlt, 1);
  assert.equal(audit.maxHeadingLevel, 7);
});

test("an explicit image alternative satisfies the accessibility audit", () => {
  const audit = auditHtmlFragment('<img src="data:image/png;base64,AA==" alt="A trend line approaching one">');
  assert.equal(audit.images, 1);
  assert.equal(audit.imagesWithoutAlt, 0);
});

test("active markup, event handlers, dangerous URLs, and CSS imports fail closed", () => {
  const audit = auditHtmlFragment('<script>alert(1)</script><img onerror="alert(1)" src="java&#x09;script:alert(1)"><img srcset="safe.png 1x, javascript:alert(1) 2x">');
  assert.ok(audit.unsafeElements > 0);
  assert.ok(audit.unsafeAttributes > 0);
  assert.ok(audit.unsafeUrls > 0);
  assert.ok(audit.errors.length >= 3);
  const importErrors = auditGeneratedCss('@import url("https://example.com/theme.css");');
  assert.ok(importErrors.includes("compiler CSS contains @import"));
  assert.ok(importErrors.includes("compiler CSS contains a non-fragment CSS URL"));
  assert.ok(importErrors.includes("compiler CSS contains unsupported @import"));
  assert.ok(auditGeneratedCss('.sk-docs-rendered p { background: url(\\6a avascript:alert(1)); }').some((error) => error.includes("CSS escape")));
  assert.ok(auditGeneratedCss('</style><script>alert(1)</script><style>').some((error) => error.includes("HTML delimiter")));
  const activeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="href" to="javascript:alert(1)"/></svg>').toString("base64");
  assert.ok(auditHtmlFragment(`<img src="data:image/svg+xml;base64,${activeSvg}" alt="active">`).errors.some((error) => error.includes("forbidden <set>")));
  assert.ok(auditGeneratedCss('@font-face { font-family: injected; src: local(system-ui); }').some((error) => error.includes("unsupported @font-face")));
  const plaintext = extractHtmlDocument('<!doctype html><html><head></head><body><plaintext>owned</plaintext></body></html>');
  assert.ok(auditHtmlFragment(plaintext.body).errors.some((error) => error.includes("forbidden <plaintext>")));
});

test("diagnostic policies block WorldBook regressions while retaining Sevara observations", () => {
  const stderr = [
    "warning: html export is under active development and incomplete",
    "chapter.typ:3:1: warning: page set rule was ignored during HTML export",
    "chapter.typ:5:1: warning: an unfamiliar warning",
  ].join("\n");
  const strict = analyzeTypstDiagnostics(stderr, "worldbook-strict-v1");
  const report = analyzeTypstDiagnostics(stderr, "sevara-report-v1");

  assert.equal(strict.warningCount, 3);
  assert.equal(strict.blockedCount, 2);
  assert.deepEqual(strict.reported.map((entry) => entry.code), ["html-export-experimental", "page-set-ignored", "unknown-warning"]);
  assert.equal(report.blockedCount, 0);
  assert.deepEqual(validateDiagnosticSummary(strict, "worldbook-strict-v1"), []);
  const forged = { ...strict, blockedCount: 0 };
  assert.ok(validateDiagnosticSummary(forged, "worldbook-strict-v1").includes("diagnostics.blockedCount does not match policy evaluation"));
});

test("dependency and repository-font digests are stable, normalized, and self-verifying", async (context) => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "authoritative-content-"));
  context.after(() => rm(sandbox, { recursive: true, force: true }));
  const sourceRoot = path.join(sandbox, "authority");
  const sourceFile = path.join(sourceRoot, "src", "chapter.typ");
  const sourceSvg = path.join(sourceRoot, "src", "figure.svg");
  const fontFile = path.join(sourceRoot, "fonts", "book.ttf");
  const packageFile = path.join(sandbox, "typst", "packages", "preview", "fletcher", "0.5.8", "src", "lib.typ");
  await Promise.all([
    mkdir(path.dirname(sourceFile), { recursive: true }),
    mkdir(path.dirname(fontFile), { recursive: true }),
    mkdir(path.dirname(packageFile), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(sourceFile, "= Magic\r\nBody\r\n"),
    writeFile(sourceSvg, "<svg>\r\n<path/>\r\n</svg>\r\n"),
    writeFile(fontFile, Buffer.from([0, 1, 2, 3])),
    writeFile(packageFile, "#let diagram = none\n"),
  ]);

  const zeroBytes = Buffer.from(`${packageFile}\0${sourceSvg}\0${sourceFile}\0${sourceFile}\0`, "utf8");
  const dependencies = await summarizeTypstDependencies({ zeroBytes, sourceRoot });
  dependencies.fonts = await summarizeFontInputs({ sourceRoot, fontPaths: [path.dirname(fontFile)], policy: "repository-only" });

  assert.deepEqual(dependencies.inputs.map((entry) => entry.path), [
    "package/@preview/fletcher:0.5.8/src/lib.typ",
    "source/src/chapter.typ",
    "source/src/figure.svg",
  ]);
  assert.equal(dependencies.inputs[1].sha256, hash("= Magic\nBody\n"));
  assert.equal(dependencies.inputs[2].sha256, hash("<svg>\n<path/>\n</svg>\n"));
  assert.deepEqual(dependencies.packages, ["@preview/fletcher:0.5.8"]);
  assert.equal(dependencies.sourceFiles, 2);
  assert.equal(dependencies.packageFiles, 1);
  assert.deepEqual(dependencies.fonts.inputs.map((entry) => entry.path), ["source/fonts/book.ttf"]);
  assert.deepEqual(validateDependencySummary(dependencies), []);

  dependencies.inputs[0].sha256 = "0".repeat(64);
  assert.ok(validateDependencySummary(dependencies).includes("dependencies.sha256 does not match inputs"));
});
