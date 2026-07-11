import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  resolveSevaraSource,
  resolveWorldbookSource,
  workspaceRoot,
} from "../content/source-integrity.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function typstVersion() {
  return execFileSync("typst", ["--version"], { encoding: "utf8" }).trim();
}

function extractHtml(document) {
  const styles = [...document.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1].trim());
  const body = document.match(/<body>([\s\S]*?)<\/body>/)?.[1]?.trim();
  if (!body) throw new Error("Typst HTML output did not contain a body element");
  return { style: styles.join("\n\n"), body };
}

function compile({ root, input, output, fontPaths = [] }) {
  const args = ["compile", "--root", root, "--features", "html", "--pretty"];
  for (const fontPath of fontPaths) args.push("--font-path", fontPath);
  args.push(input, output);
  execFileSync("typst", args, { stdio: "inherit" });
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "skopunarverk-web-content-"));
try {
  const [{ root: sevaraRoot, source: sevaraSource }, { root: worldbookRoot, source: worldbookSource }] =
    await Promise.all([resolveSevaraSource(), resolveWorldbookSource()]);
  const version = typstVersion();
  const generatedAt = new Date().toISOString();
  const jobs = [
    {
      id: "sevara",
      root: sevaraRoot,
      source: sevaraSource,
      input: path.join(sevaraRoot, "docs/sevara/complete_asset/current.typ"),
      output: path.join(temporaryRoot, "sevara.html"),
      destination: path.join(workspaceRoot, "apps/sevara/src/generated/authoritative-content.json"),
      canonicalPath: "/sevara/spec/foundations/",
      fontPaths: [],
    },
    {
      id: "worldbook",
      root: worldbookRoot,
      source: worldbookSource,
      input: path.join(worldbookRoot, "src/Volume1_WorldBasics/chapters/Chapter1_MagicSystem/chapter1.typ"),
      output: path.join(temporaryRoot, "worldbook.html"),
      destination: path.join(workspaceRoot, "apps/worldbook/src/generated/authoritative-content.json"),
      canonicalPath: "/worldbook/volumes/1-world-basics/magic/",
      fontPaths: [
        path.join(worldbookRoot, "src/common/assets/fonts/NotoSans"),
        path.join(worldbookRoot, "src/common/assets/fonts/NotoSerif"),
        path.join(worldbookRoot, "src/common/assets/fonts"),
      ],
    },
  ];

  for (const job of jobs) {
    compile(job);
    const [sourceBytes, htmlDocument] = await Promise.all([
      readFile(job.input),
      readFile(job.output, "utf8"),
    ]);
    const rendered = extractHtml(htmlDocument);
    const artifact = {
      schemaVersion: 1,
      product: job.id,
      canonicalPath: job.canonicalPath,
      source: {
        repository: job.source.repository,
        commit: job.source.commit,
        path: path.relative(job.root, job.input).replaceAll("\\", "/"),
        entrySha256: sha256(sourceBytes),
      },
      generator: { typst: version, docsContract: "@skopunarverk/docs@0.1.0" },
      generatedAt,
      style: rendered.style,
      body: rendered.body,
    };
    await mkdir(path.dirname(job.destination), { recursive: true });
    await writeFile(job.destination, `${JSON.stringify(artifact, null, 2)}\n`);
    process.stdout.write(`${job.id}: ${job.source.commit} -> ${job.canonicalPath}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
