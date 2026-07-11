# `@skopunarverk/docs`

Shared, product-neutral document primitives for the Sköpunarverk web monorepo.
The package preserves Typst's semantic document model across HTML and PDF. It
does not contain an application shell, navigation, a Tailwind theme, or product
fonts.

## Typst

Import the shared template and opt into it from a content document:

```typst
#import "@skopunarverk/docs/typst": docs-template, doc-heading, doc-figure, asset-ref

#show: docs-template.with(
  namespace: "worldbook-volume-1",
  lang: "zh",
  footnote-title: "脚注",
)

#doc-heading(1, [Magic], id: "magic", namespace: "worldbook-volume-1")
```

When a consumer cannot expose workspace files directly to the Typst compiler,
run `skopunarverk-docs prepare --out .skopunarverk/typst` and import the staged
`lib.typ`. The command copies only the package's Typst source and writes a
checksum manifest. It has no `postinstall` side effects.

The common layer provides:

- native MathML in HTML and native equations in PDF;
- namespaced HTML endnotes/backlinks and native PDF footnotes;
- stable heading IDs and same-document/cross-document references;
- inline/block code without a bundled visual theme;
- base-aware images and semantic figures;
- semantic table headers with an overflow boundary in HTML;
- common metadata and publication-manifest validators.

HTML output currently targets Typst 0.15's experimental HTML exporter. Compile
fixtures with `typst compile --features html`.

The two product sites compile their pinned authoritative Typst entrypoints during
`pnpm publish:prepare`. The generated HTML body/style artifact is committed and
validated against `sources.lock.json`; normal Cloudflare builds do not require a
system Typst binary. This follows Wonderland's separation between heavyweight
publication preparation and repeatable Web assembly.

## Astro

`@skopunarverk/docs/astro/RenderedTypst.astro` is a deliberately thin feature
boundary. It emits data attributes and no product chrome. Import
`@skopunarverk/docs/styles/functional.css` once in an app to enable only
accessibility and overflow safeguards.

## CLI

```text
skopunarverk-docs prepare [--out DIRECTORY]
skopunarverk-docs validate MANIFEST.json
skopunarverk-docs manifest [--out FILE]
```

`validate` checks the portable publication contract; it does not validate
application navigation or page layout.
