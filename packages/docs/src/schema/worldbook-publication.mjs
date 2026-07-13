import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const VOLUME_STATUSES = new Set(["in-progress", "planned"]);
const CHAPTER_STATUSES = new Set(["published", "stub", "planned"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value, field, errors) {
  if (typeof value === "string" && value.trim().length > 0) return true;
  errors.push(`${field} must be a non-empty string`);
  return false;
}

function requireExactKeys(value, expected, field, errors) {
  if (!isRecord(value)) return;
  const expectedKeys = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) errors.push(`${field}.${key} is not part of schemaVersion 1`);
  }
  for (const key of expected) {
    if (!(key in value)) errors.push(`${field}.${key} is required`);
  }
}

function validateIdentifier(value, field, errors) {
  if (requireString(value, field, errors) && !IDENTIFIER.test(value)) {
    errors.push(`${field} must be a lowercase kebab-case stable identifier`);
  }
}

function validatePositiveInteger(value, field, errors) {
  if (!Number.isSafeInteger(value) || value < 1) errors.push(`${field} must be a positive integer`);
}

function validateEntry(value, field, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (!requireString(value, field, errors)) return;
  if (
    path.posix.isAbsolute(value)
    || value.includes("\\")
    || value.includes("\0")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
    || path.posix.normalize(value) !== value
  ) {
    errors.push(`${field} must be a normalized repository-relative POSIX path without traversal`);
  }
}

function validateWebPath(value, field, errors) {
  if (value === null) return;
  if (!requireString(value, field, errors)) return;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("..")) {
    errors.push(`${field} must be null or an absolute same-site path`);
  }
}

export function validateWorldbookPublication(value) {
  const errors = [];
  if (!isRecord(value)) return ["publication must be an object"];

  requireExactKeys(
    value,
    ["schemaVersion", "product", "title", "tagline", "summary", "license", "volumes"],
    "publication",
    errors,
  );
  if (value.schemaVersion !== 1) errors.push("publication.schemaVersion must be 1");
  if (value.product !== "worldbook") errors.push('publication.product must be "worldbook"');
  requireString(value.title, "publication.title", errors);
  requireString(value.tagline, "publication.tagline", errors);
  requireString(value.summary, "publication.summary", errors);

  if (!isRecord(value.license)) {
    errors.push("publication.license must be an object");
  } else {
    requireExactKeys(value.license, ["spdx", "name", "url", "copyright"], "publication.license", errors);
    requireString(value.license.spdx, "publication.license.spdx", errors);
    requireString(value.license.name, "publication.license.name", errors);
    if (requireString(value.license.url, "publication.license.url", errors)) {
      try {
        const url = new URL(value.license.url);
        if (url.protocol !== "https:") errors.push("publication.license.url must use HTTPS");
      } catch {
        errors.push("publication.license.url must be an absolute URL");
      }
    }
    requireString(value.license.copyright, "publication.license.copyright", errors);
  }

  if (!Array.isArray(value.volumes) || value.volumes.length === 0) {
    errors.push("publication.volumes must contain at least one volume");
    return errors;
  }

  const volumeIds = new Set();
  const volumeNumbers = new Set();
  const chapterIds = new Set();
  const webPaths = new Set();
  for (const [volumeIndex, volume] of value.volumes.entries()) {
    const field = `publication.volumes[${volumeIndex}]`;
    if (!isRecord(volume)) {
      errors.push(`${field} must be an object`);
      continue;
    }
    requireExactKeys(
      volume,
      ["id", "number", "title", "englishTitle", "summary", "status", "entry", "chapters"],
      field,
      errors,
    );
    validateIdentifier(volume.id, `${field}.id`, errors);
    if (typeof volume.id === "string") {
      if (volumeIds.has(volume.id)) errors.push(`${field}.id duplicates volume id ${volume.id}`);
      volumeIds.add(volume.id);
    }
    validatePositiveInteger(volume.number, `${field}.number`, errors);
    if (volume.number !== volumeIndex + 1) errors.push(`${field}.number must be contiguous and match array order`);
    if (Number.isSafeInteger(volume.number)) {
      if (volumeNumbers.has(volume.number)) errors.push(`${field}.number duplicates volume number ${volume.number}`);
      volumeNumbers.add(volume.number);
    }
    requireString(volume.title, `${field}.title`, errors);
    requireString(volume.englishTitle, `${field}.englishTitle`, errors);
    requireString(volume.summary, `${field}.summary`, errors);
    if (!VOLUME_STATUSES.has(volume.status)) {
      errors.push(`${field}.status must be one of: ${[...VOLUME_STATUSES].join(", ")}`);
    }
    validateEntry(volume.entry, `${field}.entry`, errors);

    if (!Array.isArray(volume.chapters) || volume.chapters.length === 0) {
      errors.push(`${field}.chapters must contain at least one chapter`);
      continue;
    }
    const chapterNumbers = new Set();
    for (const [chapterIndex, chapter] of volume.chapters.entries()) {
      const chapterField = `${field}.chapters[${chapterIndex}]`;
      if (!isRecord(chapter)) {
        errors.push(`${chapterField} must be an object`);
        continue;
      }
      requireExactKeys(
        chapter,
        ["id", "number", "title", "summary", "status", "entry", "webPath"],
        chapterField,
        errors,
      );
      validateIdentifier(chapter.id, `${chapterField}.id`, errors);
      if (typeof chapter.id === "string") {
        if (chapterIds.has(chapter.id)) errors.push(`${chapterField}.id duplicates chapter id ${chapter.id}`);
        chapterIds.add(chapter.id);
      }
      validatePositiveInteger(chapter.number, `${chapterField}.number`, errors);
      if (chapter.number !== chapterIndex + 1) errors.push(`${chapterField}.number must be contiguous and match array order`);
      if (Number.isSafeInteger(chapter.number)) {
        if (chapterNumbers.has(chapter.number)) {
          errors.push(`${chapterField}.number duplicates chapter number ${chapter.number} in volume ${volume.id}`);
        }
        chapterNumbers.add(chapter.number);
      }
      requireString(chapter.title, `${chapterField}.title`, errors);
      requireString(chapter.summary, `${chapterField}.summary`, errors);
      if (!CHAPTER_STATUSES.has(chapter.status)) {
        errors.push(`${chapterField}.status must be one of: ${[...CHAPTER_STATUSES].join(", ")}`);
      }
      validateEntry(chapter.entry, `${chapterField}.entry`, errors, { nullable: true });
      if ((chapter.status === "published" || chapter.status === "stub") && chapter.entry === null) {
        errors.push(`${chapterField}.entry is required when status is ${chapter.status}`);
      }
      validateWebPath(chapter.webPath, `${chapterField}.webPath`, errors);
      if (typeof chapter.webPath === "string") {
        if (!chapter.webPath.startsWith("/worldbook/") || !chapter.webPath.endsWith("/")) {
          errors.push(`${chapterField}.webPath must stay under /worldbook/ and end with /`);
        }
        if (webPaths.has(chapter.webPath)) errors.push(`${chapterField}.webPath duplicates ${chapter.webPath}`);
        webPaths.add(chapter.webPath);
      }
      if (chapter.status === "published" && chapter.webPath === null) {
        errors.push(`${chapterField}.webPath is required when status is published`);
      }
      if (chapter.status !== "published" && chapter.webPath !== null) {
        errors.push(`${chapterField}.webPath must be null unless status is published`);
      }
    }
  }
  return errors;
}

async function validateExistingEntry(sourceRoot, entry, field, errors) {
  if (typeof entry !== "string") return;
  const sourceReal = await realpath(sourceRoot);
  const candidate = path.resolve(sourceRoot, ...entry.split("/"));
  try {
    const [candidateReal, candidateStat] = await Promise.all([realpath(candidate), stat(candidate)]);
    const relative = path.relative(sourceReal, candidateReal);
    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
      if (!candidateStat.isFile()) errors.push(`${field} must reference a file`);
    } else {
      errors.push(`${field} resolves outside the authority repository`);
    }
  } catch {
    errors.push(`${field} does not exist in the authority repository: ${entry}`);
  }
}

export async function validateWorldbookPublicationSource(value, sourceRoot) {
  const errors = validateWorldbookPublication(value);
  if (!isRecord(value) || !Array.isArray(value.volumes)) return errors;
  for (const [volumeIndex, volume] of value.volumes.entries()) {
    if (!isRecord(volume)) continue;
    await validateExistingEntry(sourceRoot, volume.entry, `publication.volumes[${volumeIndex}].entry`, errors);
    if (!Array.isArray(volume.chapters)) continue;
    for (const [chapterIndex, chapter] of volume.chapters.entries()) {
      if (!isRecord(chapter)) continue;
      await validateExistingEntry(
        sourceRoot,
        chapter.entry,
        `publication.volumes[${volumeIndex}].chapters[${chapterIndex}].entry`,
        errors,
      );
    }
  }
  return errors;
}

export async function assertWorldbookPublicationSource(value, sourceRoot) {
  const errors = await validateWorldbookPublicationSource(value, sourceRoot);
  if (errors.length > 0) throw new TypeError(`Invalid WorldBook publication metadata:\n- ${errors.join("\n- ")}`);
}

function sha256CanonicalText(bytes) {
  const canonical = bytes.toString("utf8").replaceAll("\r\n", "\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function chineseOrdinal(value) {
  const digits = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value === "十") return 10;
  if (value.startsWith("十")) return 10 + (digits[value.slice(1)] ?? 0);
  if (value.endsWith("十")) return (digits[value.slice(0, -1)] ?? 0) * 10;
  if (value.includes("十")) {
    const [tens, units] = value.split("十");
    return (digits[tens] ?? 0) * 10 + (digits[units] ?? 0);
  }
  return digits[value];
}

function kebabFromPascal(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function firstMatchingDirectory(root, expression) {
  try {
    const matches = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && expression.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function inferLegacyEntry(sourceRoot, volumeNumber, chapterNumber = null) {
  const volumeDirectory = await firstMatchingDirectory(
    path.join(sourceRoot, "src"),
    new RegExp(`^Volume${volumeNumber}_(.+)$`),
  );
  if (!volumeDirectory) return { id: `volume-${volumeNumber}`, entry: null };
  if (chapterNumber === null) {
    const entry = `src/${volumeDirectory}/${volumeDirectory}.typ`;
    return {
      id: kebabFromPascal(volumeDirectory.replace(new RegExp(`^Volume${volumeNumber}_`), "")),
      entry: await fileExists(path.join(sourceRoot, ...entry.split("/"))) ? entry : null,
    };
  }
  const chaptersRoot = path.join(sourceRoot, "src", volumeDirectory, "chapters");
  const chapterDirectory = await firstMatchingDirectory(
    chaptersRoot,
    new RegExp(`^Chapter${chapterNumber}_(.+)$`),
  );
  if (!chapterDirectory) return { id: null, entry: null };
  const entry = `src/${volumeDirectory}/chapters/${chapterDirectory}/chapter${chapterNumber}.typ`;
  return {
    id: kebabFromPascal(chapterDirectory.replace(new RegExp(`^Chapter${chapterNumber}_`), "")),
    entry: await fileExists(path.join(sourceRoot, ...entry.split("/"))) ? entry : null,
  };
}

function parseLegacyLicense(readme) {
  const link = readme.match(/\[([^\]]*CC BY-NC-SA 4\.0[^\]]*)\]\((https:\/\/[^)]+)\)/i);
  const copyright = readme.match(/^Copyright[^\r\n]+/mi)?.[0]?.replaceAll("**", "").replaceAll("[", "").replaceAll("]", "");
  return {
    spdx: "CC-BY-NC-SA-4.0",
    name: link?.[1] ?? "CC BY-NC-SA 4.0",
    url: link?.[2] ?? "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    copyright: copyright ?? "Copyright © 2025 Hemifuture",
  };
}

export async function parseLegacyWorldbookReadme(readme, sourceRoot) {
  const title = readme.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const tagline = readme.match(/^#\s+.+(?:\r?\n)+(?!#)([^\r\n]+)$/m)?.[1]?.trim();
  const contents = readme.match(/^##\s+Contents\s*$([\s\S]*)$/m)?.[1];
  if (!title || !tagline || !contents) {
    throw new TypeError("Legacy WorldBook README must contain a title, tagline, and Contents section");
  }

  const headingPattern = /^###\s+第([一二三四五六七八九十]+)卷[：:]\s*(.+?)（(.+?)）\s*$/gm;
  const headings = [...contents.matchAll(headingPattern)];
  if (headings.length === 0) throw new TypeError("Legacy WorldBook README Contents has no volume headings");
  const volumes = [];
  const usedChapterIds = new Set();
  for (const [index, match] of headings.entries()) {
    const number = chineseOrdinal(match[1]);
    const bodyStart = match.index + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? contents.length;
    const body = contents.slice(bodyStart, bodyEnd).trim();
    const summary = body.match(/^(?![-#])(.+)$/m)?.[1]?.trim();
    if (!number || !summary) throw new TypeError(`Legacy WorldBook README volume ${match[0]} has no valid number or summary`);
    const inferredVolume = await inferLegacyEntry(sourceRoot, number);
    if (!inferredVolume.entry) throw new TypeError(`Legacy WorldBook README volume ${number} has no authority Typst entry`);
    const volumeId = kebabFromPascal(match[3].trim());
    const chapters = [];
    for (const chapterMatch of body.matchAll(/^-\s+第([一二三四五六七八九十]+)章[：:]\s*(.+)\s*$/gm)) {
      const chapterNumber = chineseOrdinal(chapterMatch[1]);
      const inferredChapter = await inferLegacyEntry(sourceRoot, number, chapterNumber);
      let chapterId = inferredChapter.id ?? `${volumeId}-chapter-${chapterNumber}`;
      if (usedChapterIds.has(chapterId)) chapterId = `${volumeId}-${chapterId}`;
      usedChapterIds.add(chapterId);
      chapters.push({
        id: chapterId,
        number: chapterNumber,
        title: chapterMatch[2].trim(),
        summary: chapterMatch[2].trim(),
        status: inferredChapter.entry ? "stub" : "planned",
        entry: inferredChapter.entry,
        webPath: null,
      });
    }
    if (chapters.length === 0) throw new TypeError(`Legacy WorldBook README volume ${number} has no chapters`);
    volumes.push({
      id: volumeId,
      number,
      title: match[2].trim(),
      englishTitle: match[3].trim(),
      summary,
      status: chapters.some((chapter) => chapter.entry !== null) ? "in-progress" : "planned",
      entry: inferredVolume.entry,
      chapters,
    });
  }

  return {
    schemaVersion: 1,
    product: "worldbook",
    title,
    tagline,
    summary: tagline,
    license: parseLegacyLicense(readme),
    volumes,
  };
}

export async function loadWorldbookPublicationIndex({ sourceRoot, repository, commit, expectedMode }) {
  if (!sourceRoot) throw new TypeError("sourceRoot is required");
  if (!requireString(repository, "repository", [])) throw new TypeError("repository is required");
  if (typeof commit !== "string" || !GIT_SHA.test(commit)) throw new TypeError("commit must be a full lowercase Git SHA");
  if (expectedMode !== "structured" && expectedMode !== "legacy-readme") {
    throw new TypeError("expectedMode must explicitly select structured or legacy-readme");
  }

  const structuredPath = path.join(sourceRoot, "publication", "worldbook.json");
  const structured = await fileExists(structuredPath);
  if (expectedMode === "structured" && !structured) {
    throw new TypeError("Expected structured WorldBook publication metadata, but publication/worldbook.json is missing");
  }
  if (expectedMode === "legacy-readme" && structured) {
    throw new TypeError("Legacy README mode is not allowed once publication/worldbook.json exists");
  }
  const sourcePath = expectedMode === "structured" ? "publication/worldbook.json" : "README.md";
  const sourceBytes = await readFile(path.join(sourceRoot, ...sourcePath.split("/")));
  let publication;
  if (expectedMode === "structured") {
    try {
      publication = JSON.parse(sourceBytes.toString("utf8"));
    } catch (error) {
      throw new TypeError(`Invalid JSON in ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    publication = await parseLegacyWorldbookReadme(sourceBytes.toString("utf8"), sourceRoot);
  }
  await assertWorldbookPublicationSource(publication, sourceRoot);
  return {
    ...publication,
    source: {
      repository,
      commit,
      path: sourcePath,
      sha256: sha256CanonicalText(sourceBytes),
      mode: expectedMode,
    },
  };
}

export async function generateWorldbookPublicationIndex(options) {
  const index = await loadWorldbookPublicationIndex(options);
  if (options.outputPath) {
    await mkdir(path.dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, `${JSON.stringify(index, null, 2)}\n`);
  }
  return index;
}
