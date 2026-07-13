import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "fixtures", "capabilities.typ");
const out = join(root, "fixtures", "out");

function typst(...args) {
  return execFileSync("typst", [args[0], "--root", root, ...args.slice(1)], {
    cwd: root,
    encoding: "utf8",
  });
}

test("Typst fixture preserves the common HTML contract", () => {
  mkdirSync(out, { recursive: true });
  const output = join(out, "capabilities.html");
  typst("compile", "--features", "html", "--pretty", fixture, output);
  const html = readFileSync(output, "utf8");

  assert.match(html, /<math/);
  assert.match(html, /id="contract-fixture--overview"/);
  assert.match(html, /id="contract-fixture--footnote-ref-1"/);
  assert.match(html, /href="#contract-fixture--footnote-ref-1"/);
  assert.match(html, /role="doc-endnotes"/);
  assert.match(html, /<pre/);
  assert.match(html, /src="\/worldbook\/assets\/diagram\.svg"/);
  assert.match(html, /alt="Three connected document nodes"/);
  assert.match(html, /<thead>/);
  assert.match(html, /<th>Target<\/th>/);
  assert.match(html, /href="#contract-fixture--diagram"/);
  assert.match(html, /href="\/sevara\/spec\/#spells"/);
});

test("Typst fixture compiles to a non-empty PDF", () => {
  mkdirSync(out, { recursive: true });
  const output = join(out, "capabilities.pdf");
  typst("compile", fixture, output);
  assert.ok(statSync(output).size > 1_000);
});

test("functional styles protect unwrapped block MathML on narrow screens", () => {
  const css = readFileSync(join(root, "src", "styles", "functional.css"), "utf8");
  assert.match(css, /> math\[display="block"\]/);
  assert.match(css, /overflow-x: auto/);
  assert.doesNotMatch(css, /> math\[display="block"\]\s*\{[^}]*display:\s*block\s*;/s);
  assert.match(css, /\.sk-docs-equation--block/);
});
