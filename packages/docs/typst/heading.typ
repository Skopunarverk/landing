#import "model.typ": assert-stable-id

#let anchor-id(namespace, id) = {
  let _ = assert-stable-id(namespace, field: "heading namespace")
  let _ = assert-stable-id(id, field: "heading id")
  namespace + "--" + id
}

#let doc-heading(
  level,
  body,
  id: auto,
  namespace: "document",
  numbering: auto,
  outlined: true,
) = {
  assert(id != auto, message: "doc-heading requires an explicit stable id")
  let anchor = anchor-id(namespace, id)
  let heading-body = context if target() == "html" {
    [
      #body
      #html.elem(
        "a",
        attrs: (
          class: "sk-docs-heading__anchor",
          href: "#" + anchor,
          aria-label: "Link to this section",
        ),
        [\#],
      )
    ]
  } else {
    body
  }

  let rendered = if numbering == auto {
    heading(level: level, outlined: outlined, heading-body)
  } else {
    heading(level: level, numbering: numbering, outlined: outlined, heading-body)
  }
  [#rendered #label(anchor)]
}

#let doc-outline(title: none, depth: none) = context {
  let body = if depth == none {
    outline(title: title)
  } else {
    outline(title: title, depth: depth)
  }
  if target() == "html" {
    html.elem("nav", attrs: (class: "sk-docs-outline", aria-label: "Table of contents"), body)
  } else {
    body
  }
}
