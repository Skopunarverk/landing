import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveWorldbookSource } from "../../../tooling/content/source-integrity.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: sourceRoot, source } = await resolveWorldbookSource();
const outputRoot = path.join(appRoot, "public", "downloads");
const publication = JSON.parse(readFileSync(path.join(appRoot, "src/generated/publication-index.json"), "utf8"));
if (publication.source?.repository !== source.repository || publication.source?.commit !== source.commit) {
  throw new Error("WorldBook PDF publication index differs from the pinned authority checkout");
}
const creationTimestamp = Math.floor(Date.parse(source.committedAt) / 1000);
if (!Number.isSafeInteger(creationTimestamp)) throw new Error("WorldBook source committedAt is invalid");

mkdirSync(outputRoot, { recursive: true });

for (const volume of publication.volumes) {
  const input = path.join(sourceRoot, ...volume.entry.split("/"));
  const output = path.join(outputRoot, path.basename(volume.entry, ".typ") + ".pdf");
  const args = ["compile", "--root", sourceRoot, "--creation-timestamp", String(creationTimestamp), "--font-path", path.join(sourceRoot, "src/common/assets/fonts/NotoSans"), "--font-path", path.join(sourceRoot, "src/common/assets/fonts/NotoSerif"), "--font-path", path.join(sourceRoot, "src/common/assets/fonts"), input, output];
  console.log(`正在编译 ${volume.number} · ${volume.title}…`);
  const result = spawnSync("typst", args, { stdio: "inherit", shell: false });
  if (result.error || result.status !== 0) {
    console.error(`编译失败：${volume.id}`);
    process.exit(result.status ?? 1);
  }
}
