import { copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveSevaraSource } from "../../../tooling/content/source-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: sourceRoot, source } = await resolveSevaraSource();
const outputDir = path.join(root, "public", "downloads");
mkdirSync(outputDir, { recursive: true });

const creationTimestamp = Math.floor(Date.parse(source.committedAt) / 1000);
if (!Number.isSafeInteger(creationTimestamp)) throw new Error("Sevara source committedAt is invalid");

const authoritativeSource = path.join(sourceRoot, "docs/sevara/complete_asset/current.typ");
const companionOutput = path.join(outputDir, "sevara-language-companion.pdf");
const builds = [[authoritativeSource, companionOutput, sourceRoot]];

for (const [input, output, projectRoot] of builds) {
  const result = spawnSync("typst", [
    "compile",
    "--root",
    projectRoot,
    "--creation-timestamp",
    String(creationTimestamp),
    input,
    output,
  ], { stdio: "inherit", shell: false });
  if (result.error || result.status !== 0) {
    console.error(`Typst 编译失败：${input}`);
    process.exit(result.status ?? 1);
  }
}

// The overview route intentionally carries the same authority snapshot while
// the website provides the shorter navigational surface.
copyFileSync(companionOutput, path.join(outputDir, "sevara-overview.pdf"));
