#import "model.typ": assert-stable-id

#let html-row(cells, tag) = html.elem(
  "tr",
  for cell in cells {
    html.elem(tag, cell)
  },
)

#let doc-table(
  columns: none,
  header: none,
  rows: none,
  caption: none,
  id: none,
  namespace: "document",
) = context {
  assert(header.len() == columns, message: "table header length must match columns")
  for row in rows {
    assert(row.len() == columns, message: "each table row length must match columns")
  }

  let rendered = if target() == "html" {
    let table-body = html.elem(
      "table",
      attrs: (class: "sk-docs-table"),
      {
        if caption != none { html.elem("caption", caption) }
        html.elem("thead", html-row(header, "th"))
        html.elem(
          "tbody",
          for row in rows {
            html-row(row, "td")
          },
        )
      },
    )
    html.elem("div", attrs: (class: "sk-docs-table-scroll"), table-body)
  } else {
    let native-table = table(
      columns: columns,
      table.header(..header),
      ..rows.flatten(),
    )
    if caption == none { native-table } else { figure(native-table, caption: caption) }
  }

  if id == none {
    rendered
  } else {
    let _ = assert-stable-id(namespace, field: "table namespace")
    let _ = assert-stable-id(id, field: "table id")
    [#rendered #label(namespace + "--" + id)]
  }
}
