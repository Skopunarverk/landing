import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  generateWorldbookPublicationIndex,
  loadWorldbookPublicationIndex,
  validateWorldbookPublication,
  validateWorldbookPublicationSource,
} from "../src/schema/worldbook-publication.mjs";

const repository = "https://github.com/Hemifuture/TheWorldBook.git";
const commit = "0123456789abcdef0123456789abcdef01234567";

function publication(overrides = {}) {
  return {
    schemaVersion: 1,
    product: "worldbook",
    title: "The World Book",
    tagline: "游戏用世界设定",
    summary: "唯一权威内容清单。",
    license: {
      spdx: "CC-BY-NC-SA-4.0",
      name: "知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议 (CC BY-NC-SA 4.0)",
      url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      copyright: "Copyright © 2025 Hemifuture",
    },
    volumes: [
      {
        id: "world-basics",
        number: 1,
        title: "世界基础",
        englishTitle: "World Basics",
        summary: "基础设定。",
        status: "in-progress",
        entry: "src/Volume1/Volume1.typ",
        chapters: [
          {
            id: "magic-system",
            number: 1,
            title: "魔法体系",
            summary: "魔法体系正文。",
            status: "published",
            entry: "src/Volume1/chapters/Chapter1/chapter1.typ",
            webPath: "/worldbook/volumes/1-world-basics/magic/",
          },
        ],
      },
    ],
    ...overrides,
  };
}

async function structuredAuthority() {
  const root = await mkdtemp(path.join(tmpdir(), "worldbook-publication-"));
  await mkdir(path.join(root, "publication"), { recursive: true });
  await mkdir(path.join(root, "src", "Volume1", "chapters", "Chapter1"), { recursive: true });
  await writeFile(path.join(root, "src", "Volume1", "Volume1.typ"), "= Volume 1\n");
  await writeFile(path.join(root, "src", "Volume1", "chapters", "Chapter1", "chapter1.typ"), "= Magic\n");
  const metadata = publication();
  const source = `${JSON.stringify(metadata, null, 2)}\n`;
  await writeFile(path.join(root, "publication", "worldbook.json"), source);
  return { root, metadata, source };
}

test("structured metadata is validated and emitted with immutable provenance", async () => {
  const { root, metadata, source } = await structuredAuthority();
  const outputPath = path.join(root, "generated", "publication-index.json");
  const index = await generateWorldbookPublicationIndex({ sourceRoot: root, repository, commit, expectedMode: "structured", outputPath });

  assert.deepEqual(index.volumes, metadata.volumes);
  assert.deepEqual(index.source, {
    repository,
    commit,
    path: "publication/worldbook.json",
    sha256: createHash("sha256").update(source).digest("hex"),
    mode: "structured",
  });
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), index);
});

test("publication provenance hashes canonical LF text across platforms", async () => {
  const { root, source } = await structuredAuthority();
  await writeFile(path.join(root, "publication", "worldbook.json"), source.replaceAll("\n", "\r\n"));
  const index = await loadWorldbookPublicationIndex({ sourceRoot: root, repository, commit, expectedMode: "structured" });

  assert.equal(index.source.sha256, createHash("sha256").update(source).digest("hex"));
});

test("schema rejects duplicate ids, unsafe paths, invalid status, and missing entries", async () => {
  const { root, metadata } = await structuredAuthority();
  const secondChapter = {
    ...metadata.volumes[0].chapters[0],
    number: 2,
    entry: "../outside.typ",
    status: "final",
  };
  const invalid = structuredClone(metadata);
  invalid.volumes[0].chapters.push(secondChapter);

  const structuralErrors = validateWorldbookPublication(invalid);
  assert.ok(structuralErrors.some((error) => error.includes("duplicates chapter id magic-system")));
  assert.ok(structuralErrors.some((error) => error.includes("normalized repository-relative")));
  assert.ok(structuralErrors.some((error) => error.includes("status must be one of")));

  const contradictory = structuredClone(metadata);
  contradictory.volumes[0].chapters[0].webPath = null;
  assert.ok(validateWorldbookPublication(contradictory).some((error) => error.includes("webPath is required")));

  const missing = structuredClone(metadata);
  missing.volumes[0].chapters[0].entry = "src/Volume1/chapters/Chapter1/missing.typ";
  const sourceErrors = await validateWorldbookPublicationSource(missing, root);
  assert.ok(sourceErrors.some((error) => error.includes("does not exist in the authority repository")));
});

test("legacy README fallback derives navigation only from authority files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "worldbook-readme-"));
  await mkdir(path.join(root, "src", "Volume1_WorldBasics", "chapters", "Chapter1_MagicSystem"), { recursive: true });
  await mkdir(path.join(root, "src", "Volume2_HistoryAndSocialEvolution"), { recursive: true });
  await writeFile(path.join(root, "src", "Volume1_WorldBasics", "Volume1_WorldBasics.typ"), "= Volume 1\n");
  await writeFile(
    path.join(root, "src", "Volume1_WorldBasics", "chapters", "Chapter1_MagicSystem", "chapter1.typ"),
    "= Magic\n",
  );
  await writeFile(
    path.join(root, "src", "Volume2_HistoryAndSocialEvolution", "Volume2_HistoryAndSocialEvolution.typ"),
    "= Volume 2\n",
  );
  const readme = `# TheWorldBook

游戏用世界设定

## 版权与授权 (Copyright & License)

本作品采用 **[知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议 (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)** 进行许可。

Copyright © 2025 **[Hemifuture]**.

## Contents

### 第一卷：世界基础（World Basics）

本卷介绍权威的世界基础。

- 第一章：魔法体系
- 第二章：天文地理

### 第二卷：历史与社会演变（History and Social Evolution）

本卷介绍文明发展历程。

- 第一章：历史年代记
`;
  await writeFile(path.join(root, "README.md"), readme);

  const index = await loadWorldbookPublicationIndex({ sourceRoot: root, repository, commit, expectedMode: "legacy-readme" });
  assert.equal(index.source.mode, "legacy-readme");
  assert.equal(index.source.path, "README.md");
  assert.equal(index.volumes[0].title, "世界基础");
  assert.equal(index.volumes[0].englishTitle, "World Basics");
  assert.equal(index.volumes[0].summary, "本卷介绍权威的世界基础。");
  assert.equal(index.volumes[0].entry, "src/Volume1_WorldBasics/Volume1_WorldBasics.typ");
  assert.equal(index.volumes[0].chapters[0].id, "magic-system");
  assert.equal(index.volumes[0].chapters[0].entry, "src/Volume1_WorldBasics/chapters/Chapter1_MagicSystem/chapter1.typ");
  assert.equal(index.volumes[0].chapters[0].status, "stub");
  assert.equal(index.volumes[0].chapters[1].entry, null);
  assert.equal(index.volumes[0].chapters[1].status, "planned");
  assert.equal(index.volumes[1].status, "planned");
  assert.equal(index.volumes[1].chapters[0].title, "历史年代记");
  assert.doesNotMatch(JSON.stringify(index), /website|site copy/i);
});

test("publication mode fails closed when the pinned contract and source disagree", async () => {
  const { root } = await structuredAuthority();
  await assert.rejects(
    loadWorldbookPublicationIndex({ sourceRoot: root, repository, commit, expectedMode: "legacy-readme" }),
    /Legacy README mode is not allowed/,
  );
});
