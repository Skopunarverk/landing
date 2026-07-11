#import "model.typ": *
#import "target.typ": *
#import "math.typ": math-rules
#import "footnote.typ": footnote-rules
#import "heading.typ": *
#import "code.typ": code-rules
#import "figure.typ": *
#import "table.typ": *
#import "reference.typ": *

#let docs-template(
  body,
  namespace: "document",
  lang: none,
  region: none,
  footnote-title: [Footnotes],
  heading-numbering: none,
) = {
  let _ = assert-stable-id(namespace, field: "document namespace")
  set text(lang: lang) if lang != none
  set text(region: region) if region != none
  set heading(numbering: heading-numbering)

  show: math-rules
  show: code-rules
  show: footnote-rules.with(namespace: namespace, title: footnote-title)

  body
}
