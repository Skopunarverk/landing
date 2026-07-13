import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("React and Astro adapters share the global chrome contract", async () => {
  const [react, astro] = await Promise.all([read("../src/react/GlobalHeader.tsx"), read("../src/astro/GlobalHeader.astro")]);
  for (const contract of ["sk-header", "sk-container", "sk-product-nav", "aria-current"]) {
    assert.ok(react.includes(contract), `React header lacks ${contract}`);
    assert.ok(astro.includes(contract), `Astro header lacks ${contract}`);
  }
});

test("React and Astro brand adapters expose the same two-line identity", async () => {
  const [react, astro] = await Promise.all([read("../src/react/BrandMark.tsx"), read("../src/astro/BrandMark.astro")]);
  for (const contract of ["sk-brand__copy", "sk-brand__name", "sk-brand__tagline", "WORLD SYSTEMS"]) {
    assert.ok(react.includes(contract), `React brand mark lacks ${contract}`);
    assert.ok(astro.includes(contract), `Astro brand mark lacks ${contract}`);
  }
});

test("shared UI excludes product-specific document and motion components", async () => {
  const manifest = await read("../package.json");
  for (const forbidden of ["Sidebar", "TableOfContents", "VoxelWorld", "MotionField", "RenderedTypst"]) {
    assert.ok(!manifest.includes(forbidden));
  }
});
