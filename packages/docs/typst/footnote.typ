#import "model.typ": assert-stable-id

#let footnote-id(namespace, kind, index) = namespace + "--" + kind + "-" + str(index)

#let web-footnote(note, notes: none, namespace: "document") = context {
  let current = notes.get()
  let index = current.len() + 1
  notes.update(items => items + ((index: index, body: note.body),))

  let reference-id = footnote-id(namespace, "footnote-ref", index)
  let note-id = footnote-id(namespace, "footnote", index)

  html.elem(
    "span",
    attrs: (class: "sk-docs-footnote-wrapper"),
    {
      html.elem(
        "sup",
        attrs: (class: "sk-docs-footnote-ref", id: reference-id, role: "doc-noteref"),
        html.elem(
          "a",
          attrs: (href: "#" + note-id, aria-label: "Footnote " + str(index)),
          str(index),
        ),
      )
      html.elem(
        "span",
        attrs: (class: "sk-docs-sidenote", id: footnote-id(namespace, "sidenote", index)),
        {
          html.elem("span", attrs: (class: "sk-docs-sidenote-number"), str(index))
          html.elem("span", attrs: (class: "sk-docs-sidenote-content"), note.body)
        },
      )
    },
  )
}

#let render-web-footnotes(notes: none, namespace: "document", title: [Footnotes]) = context {
  let final-notes = notes.final()
  if final-notes.len() > 0 {
    html.elem(
      "section",
      attrs: (class: "sk-docs-footnotes", role: "doc-endnotes"),
      {
        html.elem("h2", attrs: (class: "sk-docs-footnotes-title"), title)
        html.elem(
          "ol",
          attrs: (class: "sk-docs-footnotes-list"),
          for note in final-notes {
            let reference-id = footnote-id(namespace, "footnote-ref", note.index)
            let note-id = footnote-id(namespace, "footnote", note.index)
            html.elem(
              "li",
              attrs: (class: "sk-docs-footnote-item", id: note-id),
              {
                html.elem("span", attrs: (class: "sk-docs-footnote-content"), note.body)
                html.elem(
                  "a",
                  attrs: (
                    class: "sk-docs-footnote-backref",
                    href: "#" + reference-id,
                    role: "doc-backlink",
                    aria-label: "Back to footnote " + str(note.index),
                  ),
                  [↩],
                )
              },
            )
          },
        )
      },
    )
  }
}

#let footnote-rules(
  body,
  namespace: "document",
  title: [Footnotes],
) = {
  let _ = assert-stable-id(namespace, field: "footnote namespace")
  let notes = state("sk-docs-footnotes--" + namespace, ())

  show footnote: note => context {
    if target() == "html" {
      web-footnote(note, notes: notes, namespace: namespace)
    } else {
      note
    }
  }

  body

  context if target() == "html" {
    render-web-footnotes(notes: notes, namespace: namespace, title: title)
  }
}
