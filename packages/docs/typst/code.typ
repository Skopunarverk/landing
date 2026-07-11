#let code-rules(body) = {
  show raw.where(block: false): code => context {
    if target() == "html" {
      html.elem("span", attrs: (class: "sk-docs-code sk-docs-code--inline"), code)
    } else {
      code
    }
  }

  show raw.where(block: true): code => context {
    if target() == "html" {
      html.elem("div", attrs: (class: "sk-docs-code sk-docs-code--block"), code)
    } else {
      block(width: 100%, code)
    }
  }

  body
}
