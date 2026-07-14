import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const worldbookRoot = fileURLToPath(new URL("..", import.meta.url));

test("WorldBook production HTML keeps executable scripts compatible with self-only CSP", async () => {
  const astroCli = path.join(worldbookRoot, "node_modules", "astro", "bin", "astro.mjs");
  execFileSync(process.execPath, [astroCli, "build"], {
    cwd: worldbookRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const distRoot = path.join(worldbookRoot, "dist", "worldbook");
  const htmlFiles = (await readdir(distRoot, { recursive: true }))
    .filter((entry) => entry.endsWith(".html"));
  const violations = [];

  for (const relativePath of htmlFiles) {
    const html = await readFile(path.join(distRoot, relativePath), "utf8");
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attributes = match[1];
      const type = attributes.match(/\btype=["']([^"']+)["']/i)?.[1].toLowerCase();
      const executable = !type || ["module", "text/javascript", "application/javascript"].includes(type);
      if (executable && !/\bsrc\s*=/i.test(attributes)) violations.push(relativePath);
    }
  }

  assert.deepEqual(
    [...new Set(violations)].sort(),
    [],
    "strict script-src 'self' requires every executable production script to use src",
  );
});

test("WorldBook pages consume the generated authority index", async () => {
  const dynamicPageExists = await access(new URL("../src/pages/volumes/[...chapter].astro", import.meta.url))
    .then(() => true, () => false);
  assert.equal(dynamicPageExists, true, "WorldBook must render published chapters through one catch-all page");

  const [home, volumes, downloads, layout, chapterToc] = await Promise.all([
    read("../src/pages/index.astro"),
    read("../src/pages/volumes/index.astro"),
    read("../src/pages/downloads.astro"),
    read("../src/layouts/BaseLayout.astro"),
    read("../src/components/ChapterToc.astro"),
  ]);

  for (const source of [home, volumes, downloads, layout]) {
    assert.match(source, /generated\/publication-index\.json/);
  }
  assert.doesNotMatch(home, /const\s+volumes\s*=\s*\[/);
  assert.doesNotMatch(volumes, /第一卷\s*·\s*世界基础/);
  assert.doesNotMatch(downloads, /Volume1_WorldBasics\.pdf/);
  assert.match(layout, /publication\.license/);
  assert.match(layout, /publication\.source\.commit/);
  assert.match(layout, /<slot name="overlay"/);
  assert.match(chapterToc, /<details class="chapter-toc"/);
  assert.match(chapterToc, /content\.outline|ChapterTocList/);
  assert.match(chapterToc, /pointerenter/);
  assert.match(chapterToc, /hoverPreview/);
  assert.match(chapterToc, /compactLayout/);
  assert.match(chapterToc, /closeAfterNavigation = compactLayout\.matches \|\| !pinned/);
  assert.match(chapterToc, /hoverPreview\.addEventListener\("change"/);
  assert.doesNotMatch(chapterToc, /dismissed/);
  assert.match(chapterToc, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(chapterToc, /event\.key !== "Escape"/);
  assert.equal((chapterToc.match(/<ChapterTocList/g) ?? []).length, 1);
});

test("generated WorldBook content is a bijective multi-chapter bundle", async () => {
  const [bundle, publication] = await Promise.all([
    read("../src/generated/authoritative-content.json").then(JSON.parse),
    read("../src/generated/publication-index.json").then(JSON.parse),
  ]);
  const published = publication.volumes.flatMap((volume) =>
    volume.chapters
      .filter((chapter) => chapter.status === "published" && chapter.webPath)
      .map((chapter) => ({ ...chapter, volumeId: volume.id })),
  );

  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.product, "worldbook");
  assert.ok(Array.isArray(bundle.documents));
  assert.equal(bundle.documents.length, published.length);
  assert.deepEqual(
    bundle.documents.map((document) => document.canonicalPath).sort(),
    published.map((chapter) => chapter.webPath).sort(),
  );
  for (const document of bundle.documents) {
    const chapter = published.find((candidate) => candidate.entry === document.source.path);
    assert.ok(chapter, `No published chapter describes ${document.source.path}`);
    assert.equal(document.schemaVersion, 3);
    assert.equal(document.product, "worldbook");
    assert.equal(document.canonicalPath, chapter.webPath);
    assert.equal(document.source.commit, publication.source.commit);
    assert.equal(document.outline.namespace, `worldbook-${chapter.volumeId}-${chapter.id}`);
  }
});

test("WorldBook catch-all page renders every document from its canonical path", async () => {
  const page = await read("../src/pages/volumes/[...chapter].astro");
  assert.match(page, /getStaticPaths/);
  assert.match(page, /contentBundle\.documents/);
  assert.match(page, /canonicalPath/);
  assert.match(page, /chapter\.webPath !== content\.canonicalPath/);
  assert.match(page, /ChapterToc/);
  assert.match(page, /slot="overlay"/);
  assert.match(page, /content\.outline\.items/);
  assert.match(page, /reader--article/);
  assert.match(page, /chapter-meta/);
  assert.match(page, /footnoteLayout:\s*"sidenotes"/);
  assert.doesNotMatch(page, /1-world-basics\/magic/);
});

test("generated publication index is pinned and exposes only declared Web chapters", async () => {
  const index = JSON.parse(await read("../src/generated/publication-index.json"));
  assert.match(index.source.commit, /^[a-f0-9]{40}$/);
  assert.match(index.source.sha256, /^[a-f0-9]{64}$/);
  assert.ok(["structured", "legacy-readme"].includes(index.source.mode));
  assert.equal(index.volumes.length, 4);

  const published = index.volumes.flatMap((volume) => volume.chapters).filter((chapter) => chapter.status === "published");
  assert.ok(published.length > 0);
  for (const chapter of published) {
    assert.equal(typeof chapter.entry, "string");
    assert.match(chapter.webPath, /^\/worldbook\/.+\/$/);
  }
});

test("PDF builds pin document creation time to the authority commit", async () => {
  for (const script of ["../scripts/build-pdf.mjs", "../../sevara/scripts/build-pdf.mjs"]) {
    const source = await read(script);
    assert.match(source, /source\.committedAt/);
    assert.match(source, /--creation-timestamp/);
  }
});
