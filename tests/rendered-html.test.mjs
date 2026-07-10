import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Sköpunarverk classic landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sköpunarverk｜让世界被书写，也被运行<\/title>/i);
  assert.match(html, /让世界被书写/);
  assert.match(html, /TheWorldBook/);
  assert.match(html, /Sevara/);
  assert.match(html, /ex_mmo_cluster/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og-skopunarverk\.png"/i);
  assert.doesNotMatch(html, /Genesis Initiative|>GENESIS</i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the independent voxel narrative version", async () => {
  const response = await render("/v2");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Sköpunarverk｜让世界真正发生<\/title>/i);
  assert.match(html, /从被书写到真正发生/);
  assert.match(html, /WORLD MODEL/);
  assert.match(html, /机制示例 · 设计目标/);
  assert.match(html, /全面工程融合尚未开始/);
  assert.match(html, /体素叙事版/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og-skopunarverk\.png"/i);
  assert.doesNotMatch(html, /Genesis Initiative|>GENESIS</i);
});

test("keeps the design system, shared components, and motion contracts explicit", async () => {
  const [
    page,
    layout,
    css,
    theme,
    siteConfig,
    chrome,
    ui,
    v2Page,
    v2Css,
    voxelWorld,
    motionField,
    scheduler,
    revealManager,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/theme.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/v2.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/VoxelWorld.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/MotionField.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/motion/animationScheduler.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/motion/RevealManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Project Constellation/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /new URL\("\/og-skopunarverk\.png", metadataBase\)/);
  assert.match(css, /@import "tailwindcss"/);
  assert.match(css, /@import "\.\/styles\/theme\.css"/);
  assert.match(theme, /@theme inline/);
  assert.match(theme, /\[data-visual="voxel"\]/);
  assert.match(siteConfig, /name: "Sköpunarverk"/);
  assert.match(chrome, /SiteHeader/);
  assert.match(chrome, /SiteFooter/);
  assert.match(ui, /ActionLink/);
  assert.match(ui, /SectionHeading/);
  assert.match(ui, /PrincipleList/);
  assert.match(v2Page, /VoxelWorld/);
  assert.match(v2Page, /已有基础/);
  assert.match(v2Page, /正在推进/);
  assert.match(v2Page, /设计目标/);
  assert.match(v2Css, /:hover/);
  assert.match(v2Css, /:active/);
  assert.match(v2Css, /:focus-visible/);
  assert.match(v2Css, /prefers-reduced-motion: reduce/);
  assert.match(voxelWorld, /createAnimationScheduler/);
  assert.match(motionField, /createAnimationScheduler/);
  assert.match(scheduler, /IntersectionObserver/);
  assert.match(scheduler, /visibilitychange/);
  assert.match(scheduler, /prefers-reduced-motion/);
  assert.match(revealManager, /data-v2-reveal-ready/);
  assert.match(packageJson, /"name": "skopunarverk-landing"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
