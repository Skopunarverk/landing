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

test("server-renders the Genesis landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Genesis｜让世界被书写，也被运行<\/title>/i);
  assert.match(html, /让世界被书写/);
  assert.match(html, /TheWorldBook/);
  assert.match(html, /Sevara/);
  assert.match(html, /ex_mmo_cluster/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og\.png"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the independent voxel narrative version", async () => {
  const response = await render("/v2");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Genesis V2｜让世界真正发生<\/title>/i);
  assert.match(html, /从被书写到真正发生/);
  assert.match(html, /WORLD MODEL/);
  assert.match(html, /机制示例 · 设计目标/);
  assert.match(html, /全面工程融合尚未开始/);
  assert.match(html, /体素叙事版/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og\.png"/i);
});

test("keeps the design system and interaction states explicit", async () => {
  const [page, layout, css, v2Page, v2Css, voxelWorld, motionField, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/v2.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/VoxelWorld.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2/MotionField.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Project Constellation/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /new URL\("\/og\.png", metadataBase\)/);
  assert.match(css, /@import "tailwindcss"/);
  assert.match(css, /:hover/);
  assert.match(css, /:active/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(v2Page, /VoxelWorld/);
  assert.match(v2Page, /已有基础/);
  assert.match(v2Page, /正在推进/);
  assert.match(v2Page, /设计目标/);
  assert.match(v2Css, /:hover/);
  assert.match(v2Css, /:active/);
  assert.match(v2Css, /:focus-visible/);
  assert.match(v2Css, /prefers-reduced-motion: reduce/);
  assert.match(voxelWorld, /IntersectionObserver/);
  assert.match(voxelWorld, /motionPreference\.addEventListener\("change"/);
  assert.match(motionField, /syncAnimation/);
  assert.match(motionField, /motionPreference\.addEventListener\("change"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
