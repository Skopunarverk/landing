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
  decorateHtmlFragment,
  extractHtmlDocument,
  summarizeFontInputs,
  summarizeTypstDependencies,
  validateDiagnosticSummary,
  validateDependencySummary,
  validateDocumentOutline,
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

test("HTML decoration derives a stable outline and preserves native MathML layout", () => {
  const fragment = `
    <h2>Magic</h2>
    <h3 id="anima">Anima</h3>
    <h4>Flow</h4>
    <h3>Magic</h3>
    <h4>Flow</h4>
    <math display="block"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>
  `;
  const decorated = decorateHtmlFragment(fragment, { namespace: "worldbook" });
  const repeated = decorateHtmlFragment(decorated.body, { namespace: "worldbook" });

  assert.equal(decorated.body, repeated.body);
  assert.deepEqual(decorated.outline, repeated.outline);
  assert.equal(decorated.outline.items.length, 5);
  assert.deepEqual(decorated.outline.items.map((item) => item.anchorSource), ["generated", "source", "generated", "generated", "generated"]);
  assert.equal(decorated.outline.items[1].id, "anima");
  assert.notEqual(decorated.outline.items[0].id, decorated.outline.items[3].id);
  assert.notEqual(decorated.outline.items[2].id, decorated.outline.items[4].id);
  assert.match(decorated.body, /<div class="sk-docs-equation--block" data-sk-equation-wrapper="generated" tabindex="0" role="group" aria-label="Scrollable mathematical formula"><math display="block">/);
  assert.doesNotMatch(decorated.body, /<math[^>]+style=/);
  assert.deepEqual(validateDocumentOutline(decorated.outline, { namespace: "worldbook" }), []);
});

test("HTML decoration normalizes native Typst footnotes into responsive sidenotes and endnotes", () => {
  const fragment = `
    <h2>Probe</h2>
    <p>正文<sup id="loc-1" role="doc-noteref"><a href="#loc-2">1</a></sup>。
      重复引用<sup id="shared" role="doc-noteref"><a href="#loc-3">2</a></sup>，再次引用<sup role="doc-noteref"><a href="#loc-3">2</a></sup>。</p>
    <section role="doc-endnotes"><ol style="list-style-type:none">
      <li id="loc-2"><p><sup role="doc-backlink"><a href="#loc-1">1</a></sup>第一条脚注。</p><p id="note-detail">第二段脚注，<a href="#note-detail">返回本段</a>。</p><ul><li>列表项</li></ul></li>
      <li id="loc-3"><sup role="doc-backlink"><a href="#shared">2</a></sup>包含 <em>富文本</em> 的脚注。</li>
    </ol></section>
  `;
  const decorated = decorateHtmlFragment(fragment, {
    namespace: "worldbook",
    footnoteTitle: "脚注",
    footnoteReferenceLabel: "脚注",
    footnoteBackreferenceLabel: "返回脚注引用",
  });
  const repeated = decorateHtmlFragment(decorated.body, {
    namespace: "worldbook",
    footnoteTitle: "脚注",
    footnoteReferenceLabel: "脚注",
    footnoteBackreferenceLabel: "返回脚注引用",
  });

  assert.equal(decorated.body, repeated.body);
  assert.deepEqual(decorated.outline.items.map((item) => item.text), ["Probe"]);
  assert.match(decorated.body, /<section role="doc-endnotes" class="sk-docs-footnotes" data-sk-footnotes="normalized">/);
  assert.match(decorated.body, /<h2 class="sk-docs-footnotes-title">脚注<\/h2>/);
  assert.match(decorated.body, /id="worldbook--footnote-ref-2-2"/);
  assert.match(decorated.body, /href="#worldbook--footnote-2"/);
  assert.match(decorated.body, /href="#worldbook--sidenote-2"/);
  assert.match(decorated.body, /id="worldbook--sidenote-2"/);
  assert.match(decorated.body, /id="worldbook--sidenote-2" tabindex="-1"/);
  assert.match(decorated.body, /id="worldbook--footnote-2" class="sk-docs-footnote-item" tabindex="-1"/);
  assert.match(decorated.body, /id="worldbook--footnote-ref-2-2" tabindex="-1"/);
  assert.match(decorated.body, /<aside class="sk-docs-sidenote" role="note" id="worldbook--sidenote-1"/);
  assert.match(decorated.body, /<div class="sk-docs-sidenote-content"><p>第一条脚注。<\/p><p id="worldbook--sidenote-1--fragment-1">/);
  assert.match(decorated.body, /href="#worldbook--sidenote-1--fragment-1"/);
  assert.equal((decorated.body.match(/id="note-detail"/g) ?? []).length, 1);
  assert.match(decorated.body, /<em>富文本<\/em>/);
  assert.equal((decorated.body.match(/role="doc-backlink"/g) ?? []).length, 3);
  assert.doesNotMatch(decorated.body, /href="#loc-/);
  assert.match(decorated.body, /aria-label="返回脚注引用 2\.2"/);
  assert.deepEqual(auditHtmlFragment(decorated.body).errors, []);
});

test("HTML decoration validates legacy footnotes and fails closed for incomplete native or normalized structures", () => {
  const legacy = '<p>正文<span class="sk-docs-footnote-wrapper"><sup class="sk-docs-footnote-ref" id="document--footnote-ref-1" role="doc-noteref"><a href="#document--footnote-1">1</a></sup><span class="sk-docs-sidenote" id="document--sidenote-1"><span class="sk-docs-sidenote-content">旧侧注</span></span></span></p><section class="sk-docs-footnotes" role="doc-endnotes"><ol class="sk-docs-footnotes-list"><li class="sk-docs-footnote-item" id="document--footnote-1"><span class="sk-docs-footnote-content">旧尾注</span><a class="sk-docs-footnote-backref" href="#document--footnote-ref-1" role="doc-backlink">↩</a></li></ol></section>';
  const decoratedLegacy = decorateHtmlFragment(legacy, { namespace: "document" });
  assert.equal(decoratedLegacy.body, decorateHtmlFragment(decoratedLegacy.body, { namespace: "document" }).body);
  assert.throws(
    () => decorateHtmlFragment(legacy.replace("旧侧注", ""), { namespace: "document" }),
    /must contain visible footnote content/,
  );

  const nativePair = '<p>甲<sup id="a-ref" role="doc-noteref"><a href="#a-note">1</a></sup>乙<sup id="b-ref" role="doc-noteref"><a href="#b-note">2</a></sup></p><section role="doc-endnotes"><ol><li id="a-note"><sup role="doc-backlink"><a href="#a-ref">1</a></sup>第一条说明</li><li id="b-note"><sup role="doc-backlink"><a href="#b-ref">2</a></sup>第二条说明</li></ol></section>';
  const normalizedPair = decorateHtmlFragment(nativePair, { namespace: "worldbook" }).body;
  assert.throws(
    () => decorateHtmlFragment(normalizedPair.replaceAll("worldbook--footnote-ref-1-1", "worldbook--footnote-ref-renamed"), { namespace: "worldbook" }),
    /targets the wrong note representation/,
  );
  assert.throws(
    () => decorateHtmlFragment(normalizedPair.replace('href="#worldbook--sidenote-1"', 'href="#worldbook--sidenote-2"'), { namespace: "worldbook" }),
    /targets the wrong note representation/,
  );
  assert.throws(
    () => decorateHtmlFragment(normalizedPair.replaceAll("第一条说明", ""), { namespace: "worldbook" }),
    /must contain visible footnote content/,
  );
  assert.throws(
    () => decorateHtmlFragment('<section class="sk-docs-footnotes" role="doc-endnotes" data-sk-footnotes="normalized"><h2 class="sk-docs-footnotes-title">脚注</h2><ol class="sk-docs-footnote-list"></ol></section>', { namespace: "worldbook" }),
    /must contain at least one reference and note/,
  );

  assert.throws(
    () => decorateHtmlFragment('<p>悬空引用<sup role="doc-noteref"><a href="#missing">1</a></sup></p>', { namespace: "worldbook" }),
    /requires a document endnotes section/,
  );
  assert.throws(
    () => decorateHtmlFragment('<p>伪造引用<sup role="doc-noteref"><a href="#note">1</a></sup></p><section class="sk-docs-footnotes" role="doc-endnotes"><ol><li id="note">伪造尾注</li></ol></section>', { namespace: "worldbook" }),
    /Legacy footnote reference is incomplete/,
  );
  assert.throws(
    () => decorateHtmlFragment('<p>残缺引用<sup role="doc-noteref"><a href="#note">1</a></sup></p><section role="doc-endnotes" data-sk-footnotes="normalized"><ol><li id="note">残缺尾注</li></ol></section>', { namespace: "worldbook" }),
    /marker requires its structural class/,
  );
  assert.throws(
    () => decorateHtmlFragment('<p>错误标记<sup role="doc-noteref"><a href="#note">1</a></sup></p><section class="sk-docs-footnotes" role="doc-endnotes" data-sk-footnotes="partial"><ol><li id="note">残缺尾注</li></ol></section>', { namespace: "worldbook" }),
    /unknown normalization marker/,
  );
});

test("HTML decoration lifts semantic sidenotes outside containers that forbid sectioning content", () => {
  const cases = [
    { element: "table", content: '<table><tbody><tr><th><div><p>表头<sup id="ref" role="doc-noteref"><a href="#note">1</a></sup></p></div></th></tr></tbody></table>' },
    { element: "dl", content: '<dl><dt><div><p>术语<sup id="ref" role="doc-noteref"><a href="#note">1</a></sup></p></div></dt><dd>定义</dd></dl>' },
    { element: "address", content: '<address><div><p>地址<sup id="ref" role="doc-noteref"><a href="#note">1</a></sup></p></div></address>' },
    { element: "details", content: '<details><summary>摘要<sup id="ref" role="doc-noteref"><a href="#note">1</a></sup></summary><p>详情</p></details>' },
    { element: "fieldset", content: '<fieldset><legend>分组<sup id="ref" role="doc-noteref"><a href="#note">1</a></sup></legend></fieldset>' },
  ];
  const endnotes = '<section role="doc-endnotes"><ol><li id="note"><sup role="doc-backlink"><a href="#ref">1</a></sup>说明</li></ol></section>';

  for (const { element, content } of cases) {
    const body = decorateHtmlFragment(content + endnotes, { namespace: "worldbook" }).body;
    assert.ok(body.indexOf('<aside class="sk-docs-sidenote"') < body.indexOf(`<${element}`), `sidenote must be lifted before ${element}`);
    assert.deepEqual(auditHtmlFragment(body).errors, []);
  }
});

test("HTML decoration fails closed for unsafe equation parents and excludes generated document tables of contents", () => {
  assert.throws(
    () => decorateHtmlFragment('<p><math display="block"><mi>x</mi></math></p>', { namespace: "worldbook" }),
    /cannot be wrapped safely/,
  );
  assert.throws(
    () => decorateHtmlFragment('<span class="sk-docs-equation--block"><math display="block"><mi>x</mi></math></span>', { namespace: "worldbook" }),
    /cannot be wrapped safely/,
  );
  for (const parent of ["button", "summary", "meter", "output", "ruby"]) {
    assert.throws(
      () => decorateHtmlFragment(`<${parent}><math display="block"><mi>x</mi></math></${parent}>`, { namespace: "worldbook" }),
      /cannot be wrapped safely/,
    );
  }

  const decorated = decorateHtmlFragment('<nav role="doc-toc"><h2>目录</h2></nav><h2>正文</h2>', { namespace: "sevara" });
  assert.deepEqual(decorated.outline.items.map((item) => item.text), ["正文"]);
  assert.doesNotMatch(decorated.body, /sevara-目录/);

  const ambiguous = { ...decorated.outline, items: [{ ...decorated.outline.items[0], id: "a%20b" }] };
  assert.ok(validateDocumentOutline(ambiguous, { namespace: "sevara" }).includes("outline item id must use fragment-safe characters"));
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
