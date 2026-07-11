import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const cli = join(root, "src", "cli", "index.mjs");

test("prepare stages Typst sources with checksums", () => {
  const directory = mkdtempSync(join(tmpdir(), "sk-docs-"));
  const output = join(directory, "typst");
  execFileSync(process.execPath, [cli, "prepare", "--out", output], { cwd: root });
  const manifest = JSON.parse(readFileSync(join(output, "staging-manifest.json"), "utf8"));
  assert.equal(manifest.package, "@skopunarverk/docs");
  assert.ok(manifest.files.some((file) => file.path === "lib.typ"));
  assert.ok(manifest.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
});

test("validate accepts the fixture and rejects incomplete or semantically invalid manifests", () => {
  const valid = spawnSync(
    process.execPath,
    [cli, "validate", join(root, "fixtures", "publication-manifest.json")],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(valid.status, 0, valid.stderr);

  const directory = mkdtempSync(join(tmpdir(), "sk-docs-invalid-"));
  const invalidPath = join(directory, "invalid.json");
  const command = `require('node:fs').writeFileSync(${JSON.stringify(invalidPath)}, '{}')`;
  execFileSync(process.execPath, ["-e", command]);
  const invalid = spawnSync(process.execPath, [cli, "validate", invalidPath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /document must be an object/);

  const semanticPath = join(directory, "semantic-invalid.json");
  const semantic = {
    document: { id: "Bad ID", namespace: "bad", title: "Bad", lang: "en" },
    sourceCommit: "not-a-commit",
    generatedAt: "not-a-date",
    targets: ["html"],
    artifacts: [{ target: "pdf", path: "/bad.pdf", sha256: "bad", bytes: -1 }],
  };
  const semanticCommand = `require('node:fs').writeFileSync(${JSON.stringify(semanticPath)}, ${JSON.stringify(JSON.stringify(semantic))})`;
  execFileSync(process.execPath, ["-e", semanticCommand]);
  const semanticInvalid = spawnSync(process.execPath, [cli, "validate", semanticPath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(semanticInvalid.status, 1);
  assert.match(semanticInvalid.stderr, /artifacts has no html entry/);
});
