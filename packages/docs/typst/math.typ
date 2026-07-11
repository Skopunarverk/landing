#let math-rules(body) = {
  show math.equation.where(block: true): equation => context {
    if target() == "html" {
      html.elem(
        "div",
        attrs: (class: "sk-docs-equation sk-docs-equation--block", role: "math"),
        equation,
      )
    } else {
      equation
    }
  }

  show math.equation.where(block: false): equation => context {
    if target() == "html" {
      html.elem(
        "span",
        attrs: (class: "sk-docs-equation sk-docs-equation--inline", role: "math"),
        equation,
      )
    } else {
      equation
    }
  }

  body
}
