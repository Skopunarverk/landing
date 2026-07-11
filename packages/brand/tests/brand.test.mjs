import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps brand data framework-neutral", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.match(source, /Sköpunarverk/);
  assert.doesNotMatch(source, /from ["'](?:react|astro)/);
  for (const route of ["/", "/sevara/", "/worldbook/"]) assert.ok(source.includes(route));
});
