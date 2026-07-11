#import "model.typ": assert-stable-id

#let trim-slashes(value) = value.replace(regex("^/+|/+$"), "")

#let resolve-web-asset(path, base-path: "/") = {
  if path.starts-with("http://") or path.starts-with("https://") or path.starts-with("data:") {
    path
  } else {
    let base = trim-slashes(base-path)
    let asset = trim-slashes(path)
    "/" + if base == "" { asset } else { base + "/" + asset }
  }
}

#let attrs-with-size(attrs, width: none, height: none) = {
  let result = attrs
  if width != none and type(width) in (str, int, float) { result += (width: str(width),) }
  if height != none and type(height) in (str, int, float) { result += (height: str(height),) }
  result
}

#let doc-image(asset, base-path: "/") = context {
  if target() == "html" {
    let attrs = (
      src: resolve-web-asset(asset.web-path, base-path: base-path),
      ..if asset.alt == none { (alt: "",) } else { (alt: asset.alt,) },
    )
    attrs = attrs-with-size(
      attrs,
      width: if asset.width == auto { none } else { asset.width },
      height: if asset.height == auto { none } else { asset.height },
    )
    html.elem("img", attrs: attrs)
  } else {
    image(
      asset.source,
      width: asset.width,
      height: asset.height,
      alt: asset.alt,
    )
  }
}

#let doc-figure(
  asset,
  caption: none,
  id: none,
  namespace: "document",
  base-path: "/",
) = {
  let rendered = figure(doc-image(asset, base-path: base-path), caption: caption)
  if id == none {
    rendered
  } else {
    let _ = assert-stable-id(namespace, field: "figure namespace")
    let _ = assert-stable-id(id, field: "figure id")
    [#rendered #label(namespace + "--" + id)]
  }
}
