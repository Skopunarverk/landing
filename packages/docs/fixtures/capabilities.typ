#import "../typst/lib.typ": *

#show: docs-template.with(
  namespace: "contract-fixture",
  lang: "en",
  footnote-title: [Notes],
  heading-numbering: "1.",
)

#doc-heading(1, [Shared document contract], id: "overview", namespace: "contract-fixture")

Inline math $a^2 + b^2 = c^2$ and a displayed equation:

$ integral_0^1 x^2 dif x = 1/3 $ <equation>

Rich footnotes retain _emphasis_ and #link("https://typst.app")[links].#footnote[
  A note with *strong text* and #link("https://typst.app/docs")[a link].
]

Inline `let answer = 42` and a block:

```typ
#let answer = 42
answer
```

#let diagram = asset-ref(
  source: "/fixtures/assets/diagram.svg",
  web-path: "assets/diagram.svg",
  alt: "Three connected document nodes",
  width: 70%,
)

#doc-figure(
  diagram,
  caption: [A base-aware figure.],
  id: "diagram",
  namespace: "contract-fixture",
  base-path: "/worldbook",
)

#doc-table(
  columns: 2,
  header: ([Target], [Representation]),
  rows: (
    ([HTML], [Semantic elements]),
    ([PDF], [Native Typst layout]),
  ),
  caption: [Shared output contract.],
  id: "targets",
  namespace: "contract-fixture",
)

See #doc-ref("overview", namespace: "contract-fixture") and
#doc-ref("diagram", namespace: "contract-fixture", body: [the figure]).
Read #cross-doc-ref(
  "/sevara/spec/#spells",
  [the Sevara spell specification],
  document-id: "sevara-spec",
  anchor: "spells",
).
