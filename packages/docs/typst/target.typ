#let render-target = context target()
#let is-html = context target() == "html"
#let is-paged = context target() == "paged"

#let when-html(html-body, paged-body: none) = context {
  if target() == "html" { html-body } else { paged-body }
}

#let when-paged(paged-body, html-body: none) = context {
  if target() == "paged" { paged-body } else { html-body }
}
