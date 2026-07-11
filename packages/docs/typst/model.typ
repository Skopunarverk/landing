// Portable data constructors shared by both document sites. These dictionaries
// intentionally exclude site navigation and presentation concerns.

#let stable-id-pattern = regex("^[a-z0-9]+([._-][a-z0-9]+)*$")

#let assert-stable-id(value, field: "id") = {
  assert(type(value) == str and value.match(stable-id-pattern) != none, message: field + " must be a lowercase stable identifier")
  value
}

#let document-meta(
  id: none,
  namespace: none,
  title: none,
  lang: none,
  description: none,
  source-path: none,
  canonical-path: none,
) = (
  id: assert-stable-id(id, field: "document id"),
  namespace: assert-stable-id(namespace, field: "document namespace"),
  title: title,
  lang: lang,
  description: description,
  source-path: source-path,
  canonical-path: canonical-path,
)

#let asset-ref(
  source: none,
  web-path: none,
  alt: none,
  width: auto,
  height: auto,
) = (
  source: source,
  web-path: if web-path == none { source } else { web-path },
  alt: alt,
  width: width,
  height: height,
)

#let reference-target(document-id: none, anchor: none, href: none) = (
  document-id: assert-stable-id(document-id, field: "reference document id"),
  anchor: assert-stable-id(anchor, field: "reference anchor"),
  href: href,
)

#let output-artifact(target: none, path: none, sha256: none, bytes: none) = {
  assert(target in ("html", "pdf"), message: "artifact target must be html or pdf")
  (target: target, path: path, sha256: sha256, bytes: bytes)
}

#let build-fingerprint(
  docs-version: none,
  typst-version: none,
  source-commit: none,
  fonts-hash: none,
) = (
  docs-version: docs-version,
  typst-version: typst-version,
  source-commit: source-commit,
  fonts-hash: fonts-hash,
)

#let publication-meta(
  document: none,
  source-commit: none,
  generated-at: none,
  targets: none,
  artifacts: none,
  fingerprint: none,
) = (
  document: document,
  source-commit: source-commit,
  generated-at: generated-at,
  targets: targets,
  artifacts: artifacts,
  fingerprint: fingerprint,
)
