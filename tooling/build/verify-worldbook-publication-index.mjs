import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateWorldbookPublication } from "../../packages/docs/src/schema/worldbook-publication.mjs";
import { readSourcesLock, workspaceRoot } from "../content/source-integrity.mjs";

const [lock, raw] = await Promise.all([
  readSourcesLock(),
  readFile(path.join(workspaceRoot, "apps/worldbook/src/generated/publication-index.json"), "utf8"),
]);
const index = JSON.parse(raw);
const { source, ...publication } = index;
const errors = validateWorldbookPublication(publication);

if (source?.repository !== lock.sources.worldbook.repository) errors.push("source.repository differs from sources.lock.json");
if (source?.commit !== lock.sources.worldbook.commit) errors.push("source.commit differs from sources.lock.json");
if (source?.mode !== lock.sources.worldbook.publication?.mode) errors.push("source.mode differs from sources.lock.json");
if (source?.path !== lock.sources.worldbook.publication?.path) errors.push("source.path differs from sources.lock.json");
if (source?.sha256 !== lock.sources.worldbook.publication?.sha256) errors.push("source.sha256 differs from sources.lock.json");

const published = publication.volumes
  .flatMap((volume) => volume.chapters)
  .filter((chapter) => chapter.status === "published");
if (published.length === 0) errors.push("publication index exposes no published Web chapter");

if (errors.length > 0) throw new Error(`Invalid generated WorldBook publication index:\n- ${errors.join("\n- ")}`);
process.stdout.write(`worldbook publication index matches ${source.commit} (${source.mode})\n`);
