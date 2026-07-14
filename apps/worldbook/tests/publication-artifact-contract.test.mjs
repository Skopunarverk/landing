import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { assertWorldbookManifestCoverage } from "../../../tooling/build/publication-artifact-contract.mjs";
import { assertPinnedCheckout } from "../../../tooling/content/source-integrity.mjs";

const lockSource = {
  repository: "https://example.test/worldbook.git",
  commit: "a".repeat(40),
  committedAt: "2026-07-14T00:00:00Z",
};

function fixture() {
  const documents = ["first", "second"].map((slug) => ({
    canonicalPath: `/worldbook/volumes/1-world-basics/${slug}/`,
    generatedAt: lockSource.committedAt,
    source: {
      repository: lockSource.repository,
      commit: lockSource.commit,
      path: `src/${slug}.typ`,
    },
  }));
  const publicationIndex = {
    source: { repository: lockSource.repository, commit: lockSource.commit },
  };
  return {
    bundle: {
      schemaVersion: 1,
      product: "worldbook",
      source: { repository: lockSource.repository, commit: lockSource.commit },
      generatedAt: lockSource.committedAt,
      documents,
    },
    manifest: {
      product: "worldbook",
      sourceCommit: lockSource.commit,
      generatedAt: lockSource.committedAt,
      source: lockSource,
      publicationIndex: {
        source: { repository: lockSource.repository, commit: lockSource.commit },
      },
      artifacts: [
        ...documents.map((document) => ({ target: "html", path: document.canonicalPath })),
        { target: "pdf", path: "/worldbook/downloads/Volume1.pdf" },
      ],
    },
    publicationIndex,
  };
}

test("WorldBook manifest HTML paths are a bijection with bundled documents", () => {
  const { manifest, bundle, publicationIndex } = fixture();
  assert.doesNotThrow(() => assertWorldbookManifestCoverage({ manifest, bundle, publicationIndex, lockSource }));

  const missing = structuredClone(manifest);
  missing.artifacts.splice(1, 1);
  assert.throws(
    () => assertWorldbookManifestCoverage({ manifest: missing, bundle, publicationIndex, lockSource }),
    /HTML artifact paths do not match bundled documents/,
  );

  const duplicate = structuredClone(manifest);
  duplicate.artifacts.splice(1, 0, structuredClone(duplicate.artifacts[0]));
  assert.throws(
    () => assertWorldbookManifestCoverage({ manifest: duplicate, bundle, publicationIndex, lockSource }),
    /duplicate manifest HTML artifact path/,
  );

  const extra = structuredClone(manifest);
  extra.artifacts.splice(2, 0, { target: "html", path: "/worldbook/volumes/extra/" });
  assert.throws(
    () => assertWorldbookManifestCoverage({ manifest: extra, bundle, publicationIndex, lockSource }),
    /HTML artifact paths do not match bundled documents/,
  );
});

test("WorldBook manifest provenance must match the locked source", () => {
  const { manifest, bundle, publicationIndex } = fixture();
  const polluted = structuredClone(bundle);
  polluted.documents[1].source.commit = "b".repeat(40);
  assert.throws(
    () => assertWorldbookManifestCoverage({ manifest, bundle: polluted, publicationIndex, lockSource }),
    /document source commit does not match sources.lock.json/,
  );

  const pollutedIndex = structuredClone(publicationIndex);
  pollutedIndex.source.commit = "c".repeat(40);
  assert.throws(
    () => assertWorldbookManifestCoverage({ manifest, bundle, publicationIndex: pollutedIndex, lockSource }),
    /generated publication index commit does not match sources.lock.json/,
  );
});

test("production source validation rejects a dirty checkout without relying on a cached authority clone", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "worldbook-dirty-source-"));
  const checkout = path.join(tempRoot, "checkout");
  try {
    const runGit = (...args) => execFileSync("git", args, { cwd: checkout, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    execFileSync("git", ["init", checkout], { stdio: "ignore" });
    await writeFile(path.join(checkout, "authority.typ"), "= clean authority\n");
    runGit("add", "authority.typ");
    runGit("-c", "user.name=WorldBook Test", "-c", "user.email=worldbook@example.test", "commit", "-m", "fixture");
    const repository = "https://example.test/worldbook.git";
    runGit("remote", "add", "origin", repository);
    const commit = runGit("rev-parse", "HEAD");

    await appendFile(path.join(checkout, "authority.typ"), "// dirty source rejection regression probe\n");
    assert.throws(
      () => assertPinnedCheckout(checkout, { repository, commit }, "worldbook"),
      /pinned source checkout is dirty/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
