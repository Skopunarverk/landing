#import "model.typ": assert-stable-id

#let reference-label(namespace, id) = {
  let _ = assert-stable-id(namespace, field: "reference namespace")
  let _ = assert-stable-id(id, field: "reference id")
  label(namespace + "--" + id)
}

#let doc-ref(id, namespace: "document", body: none, supplement: auto) = {
  let target = reference-label(namespace, id)
  if body == none {
    ref(target, supplement: supplement)
  } else {
    link(target, body)
  }
}

#let cross-doc-ref(href, body, document-id: none, anchor: none) = {
  let attrs = (:)
  if document-id != none { attrs += ("data-document-id": document-id,) }
  if anchor != none { attrs += ("data-reference-anchor": anchor,) }

  context if target() == "html" {
    html.elem("a", attrs: (href: href, ..attrs), body)
  } else {
    link(href, body)
  }
}
