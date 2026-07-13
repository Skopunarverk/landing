import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("WorldBook pages consume the generated authority index", async () => {
  const [home, volumes, downloads, magic, layout, chapterToc] = await Promise.all([
    read("../src/pages/index.astro"),
    read("../src/pages/volumes/index.astro"),
    read("../src/pages/downloads.astro"),
    read("../src/pages/volumes/1-world-basics/magic/index.astro"),
    read("../src/layouts/BaseLayout.astro"),
    read("../src/components/ChapterToc.astro"),
  ]);

  for (const source of [home, volumes, downloads, magic, layout]) {
    assert.match(source, /generated\/publication-index\.json/);
  }
  assert.doesNotMatch(home, /const\s+volumes\s*=\s*\[/);
  assert.doesNotMatch(volumes, /第一卷\s*·\s*世界基础/);
  assert.doesNotMatch(downloads, /Volume1_WorldBasics\.pdf/);
  assert.match(layout, /publication\.license/);
  assert.match(layout, /publication\.source\.commit/);
  assert.match(layout, /<slot name="overlay"/);
  assert.match(magic, /ChapterToc/);
  assert.match(magic, /slot="overlay"/);
  assert.match(magic, /content\.outline\.items/);
  assert.match(magic, /reader--article/);
  assert.match(magic, /chapter-meta/);
  assert.match(magic, /footnoteLayout:\s*"sidenotes"/);
  assert.doesNotMatch(magic, /<aside class="folio-nav"/);
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
