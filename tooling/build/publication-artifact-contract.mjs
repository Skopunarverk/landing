function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, received ${actual}`);
}

function uniqueSorted(values, label) {
  const unique = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
    if (unique.has(value)) throw new Error(`duplicate ${label}: ${value}`);
    unique.add(value);
  }
  return [...unique].sort();
}

export function assertWorldbookManifestCoverage({ manifest, bundle, publicationIndex, lockSource }) {
  assertEqual(manifest.product, "worldbook", "manifest product");
  assertEqual(bundle.product, "worldbook", "authoritative content product");
  assertEqual(bundle.schemaVersion, 1, "authoritative content bundle schemaVersion");
  if (!Array.isArray(bundle.documents) || bundle.documents.length === 0) {
    throw new Error("authoritative content bundle must contain at least one document");
  }
  if (!Array.isArray(manifest.artifacts)) throw new Error("manifest artifacts must be an array");

  assertEqual(manifest.sourceCommit, lockSource.commit, "manifest sourceCommit does not match sources.lock.json");
  assertEqual(manifest.source?.repository, lockSource.repository, "manifest source repository does not match sources.lock.json");
  assertEqual(manifest.source?.commit, lockSource.commit, "manifest source commit does not match sources.lock.json");
  assertEqual(manifest.source?.committedAt, lockSource.committedAt, "manifest source committedAt does not match sources.lock.json");
  assertEqual(manifest.generatedAt, lockSource.committedAt, "manifest generatedAt does not match sources.lock.json");
  assertEqual(
    manifest.publicationIndex?.source?.repository,
    lockSource.repository,
    "manifest publication index repository does not match sources.lock.json",
  );
  assertEqual(
    manifest.publicationIndex?.source?.commit,
    lockSource.commit,
    "manifest publication index commit does not match sources.lock.json",
  );
  assertEqual(
    publicationIndex?.source?.repository,
    lockSource.repository,
    "generated publication index repository does not match sources.lock.json",
  );
  assertEqual(
    publicationIndex?.source?.commit,
    lockSource.commit,
    "generated publication index commit does not match sources.lock.json",
  );
  assertEqual(bundle.source?.repository, lockSource.repository, "bundle source repository does not match sources.lock.json");
  assertEqual(bundle.source?.commit, lockSource.commit, "bundle source commit does not match sources.lock.json");
  assertEqual(bundle.generatedAt, lockSource.committedAt, "bundle generatedAt does not match sources.lock.json");

  if (lockSource.publication) {
    for (const [label, publication] of [
      ["manifest source publication", manifest.source?.publication],
      ["manifest publication index source", manifest.publicationIndex?.source],
      ["generated publication index source", publicationIndex?.source],
    ]) {
      assertEqual(publication?.mode, lockSource.publication.mode, `${label} mode does not match sources.lock.json`);
      assertEqual(publication?.path, lockSource.publication.path, `${label} path does not match sources.lock.json`);
      assertEqual(publication?.sha256, lockSource.publication.sha256, `${label} sha256 does not match sources.lock.json`);
    }
  }

  for (const document of bundle.documents) {
    assertEqual(document.source?.repository, lockSource.repository, "document source repository does not match sources.lock.json");
    assertEqual(document.source?.commit, lockSource.commit, "document source commit does not match sources.lock.json");
    assertEqual(document.generatedAt, lockSource.committedAt, "document generatedAt does not match sources.lock.json");
  }

  const expectedHtmlPaths = uniqueSorted(
    bundle.documents.map((document) => document.canonicalPath),
    "bundled document canonical path",
  );
  const manifestHtmlPaths = uniqueSorted(
    manifest.artifacts.filter((artifact) => artifact.target === "html").map((artifact) => artifact.path),
    "manifest HTML artifact path",
  );
  if (JSON.stringify(manifestHtmlPaths) !== JSON.stringify(expectedHtmlPaths)) {
    throw new Error(
      `WorldBook manifest HTML artifact paths do not match bundled documents: expected ${expectedHtmlPaths.join(", ")}; received ${manifestHtmlPaths.join(", ")}`,
    );
  }
}
