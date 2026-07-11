import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveWorldbookSource } from "../../../tooling/content/source-integrity.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: sourceRoot } = await resolveWorldbookSource();
const outputRoot = path.join(appRoot, "public", "downloads");
const volumes = ["Volume1_WorldBasics", "Volume2_HistoryAndSocialEvolution", "Volume3_CultureAndCivilization", "Volume4_SocialLifeAndChallenge"];

mkdirSync(outputRoot, { recursive: true });

for (const volume of volumes) {
  const input = path.join(sourceRoot, "src", volume, `${volume}.typ`);
  const output = path.join(outputRoot, `${volume}.pdf`);
  const args = ["compile", "--root", sourceRoot, "--font-path", path.join(sourceRoot, "src/common/assets/fonts/NotoSans"), "--font-path", path.join(sourceRoot, "src/common/assets/fonts/NotoSerif"), "--font-path", path.join(sourceRoot, "src/common/assets/fonts"), input, output];
  console.log(`正在编译 ${volume}…`);
  const result = spawnSync("typst", args, { stdio: "inherit", shell: false });
  if (result.error || result.status !== 0) {
    console.error(`编译失败：${volume}`);
    process.exit(result.status ?? 1);
  }
}
