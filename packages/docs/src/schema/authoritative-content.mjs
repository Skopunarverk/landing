import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { parse, parseFragment, serialize, serializeOuter } from "parse5";
import postcss from "postcss";

const PARSER = "parse5@7.3.0";
const EXPERIMENTAL_WARNING = "html export is under active development and incomplete";
const TEXT_EXTENSIONS = new Set([
  ".bib", ".css", ".csv", ".htm", ".html", ".js", ".json", ".md", ".svg", ".toml", ".tsv", ".txt", ".typ", ".xml", ".yaml", ".yml",
]);
const FORBIDDEN_ELEMENTS = new Set([
  "animate", "animatemotion", "animatetransform", "applet", "base", "discard", "embed", "foreignobject", "form", "frame", "frameset", "iframe", "input", "link", "meta", "object", "plaintext", "script", "set", "style",
]);
const URL_ATTRIBUTES = new Set(["action", "formaction", "href", "poster", "src", "srcset", "xlink:href"]);
const FIGURE_CONTENT_ELEMENTS = new Set(["audio", "canvas", "img", "math", "picture", "pre", "svg", "table", "video"]);
const SVG_GRAPHIC_ELEMENTS = new Set(["circle", "ellipse", "image", "line", "path", "polygon", "polyline", "rect", "text", "use"]);
const GENERATED_ANCHOR_ATTRIBUTE = "data-sk-anchor";
const EQUATION_WRAPPER_CLASS = "sk-docs-equation--block";
const EQUATION_WRAPPER_ATTRIBUTE = "data-sk-equation-wrapper";
const EQUATION_FLOW_CONTAINERS = new Set(["address", "article", "aside", "blockquote", "body", "dd", "details", "dialog", "div", "dt", "fieldset", "figcaption", "figure", "footer", "form", "header", "li", "main", "nav", "section", "td", "th"]);
const SIDENOTE_SECTIONING_CONTAINERS = new Set(["article", "aside", "blockquote", "body", "dd", "dialog", "div", "figcaption", "footer", "form", "header", "li", "main", "nav", "section", "td"]);
const SIDENOTE_FORBIDDEN_ANCESTORS = new Set(["address", "dt", "th"]);
const FOOTNOTE_SECTION_CLASS = "sk-docs-footnotes";
const FOOTNOTE_NORMALIZED_ATTRIBUTE = "data-sk-footnotes";
const ID_REFERENCE_ATTRIBUTES = new Set(["aria-controls", "aria-describedby", "aria-details", "aria-errormessage", "aria-flowto", "aria-labelledby", "for", "headers"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stripWindowsNamespace(value) {
  if (value.startsWith("\\\\?\\UNC\\")) return `\\\\${value.slice(8)}`;
  if (value.startsWith("\\\\?\\")) return value.slice(4);
  return value;
}

function canonicalText(bytes) {
  return Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
}

async function fileDigest(filePath) {
  const bytes = await readFile(filePath);
  const value = TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()) ? canonicalText(bytes) : bytes;
  return sha256(value);
}

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

function elementName(node) {
  return typeof node.tagName === "string" ? node.tagName.toLowerCase() : null;
}

function attrs(node) {
  return new Map((node.attrs ?? []).map((entry) => [entry.name.toLowerCase(), entry.value]));
}

function setAttr(node, name, value) {
  const existing = (node.attrs ?? []).find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.value = value;
  else (node.attrs ??= []).push({ name, value });
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function headingSlug(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}\p{Mark}]+/gu, "-")
    .replaceAll(/^-+|-+$/g, "") || "section";
}

function hasClass(node, className) {
  if (!node) return false;
  return (attrs(node).get("class") ?? "").split(/\s+/).includes(className);
}

function addClass(node, className) {
  const classes = new Set((attrs(node).get("class") ?? "").split(/\s+/).filter(Boolean));
  classes.add(className);
  setAttr(node, "class", [...classes].join(" "));
}

function setChildren(node, children) {
  node.childNodes = children;
  for (const child of children) child.parentNode = node;
}

function textNode(value) {
  return { nodeName: "#text", value: String(value) };
}

function htmlElement(markup) {
  const nodes = parseFragment(markup).childNodes;
  if (nodes.length !== 1 || !elementName(nodes[0])) throw new Error("Expected one HTML element");
  return nodes[0];
}

function cloneHtmlNodes(nodes) {
  return parseFragment(nodes.map((node) => serializeOuter(node)).join("")).childNodes;
}

function removeMatchingNodes(nodes, predicate) {
  const kept = [];
  for (const node of nodes) {
    if (predicate(node)) continue;
    if (node.childNodes) setChildren(node, removeMatchingNodes(node.childNodes, predicate));
    kept.push(node);
  }
  return kept;
}

function sidenoteContentNodes(nodes, sidenoteId, usedIds) {
  const cloned = cloneHtmlNodes(nodes);
  const idMap = new Map();
  let idOrdinal = 1;
  walk({ childNodes: cloned }, (node) => {
    if (!elementName(node)) return;
    const id = attrs(node).get("id");
    if (!id) return;
    const clonedId = reserveGeneratedId(usedIds, `${sidenoteId}--fragment-${idOrdinal++}`);
    idMap.set(id, clonedId);
    setAttr(node, "id", clonedId);
  });
  walk({ childNodes: cloned }, (node) => {
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase();
      if (name === "href" && attribute.value.startsWith("#") && idMap.has(attribute.value.slice(1))) {
        attribute.value = `#${idMap.get(attribute.value.slice(1))}`;
      } else if (ID_REFERENCE_ATTRIBUTES.has(name)) {
        attribute.value = attribute.value.split(/\s+/).map((id) => idMap.get(id) ?? id).join(" ");
      }
    }
  });
  return cloned;
}

function insertSidenoteBeforeReferenceBlock(reference, sidenote) {
  let anchor = reference.parentNode;
  while (anchor?.parentNode) {
    const parent = anchor.parentNode;
    let forbiddenAncestor = false;
    for (let ancestor = parent; ancestor; ancestor = ancestor.parentNode) {
      if (SIDENOTE_FORBIDDEN_ANCESTORS.has(elementName(ancestor))) {
        forbiddenAncestor = true;
        break;
      }
    }
    if (!forbiddenAncestor && (parent.nodeName === "#document-fragment" || SIDENOTE_SECTIONING_CONTAINERS.has(elementName(parent)))) {
      const index = parent.childNodes?.indexOf(anchor) ?? -1;
      if (index < 0) break;
      sidenote.parentNode = parent;
      parent.childNodes.splice(index, 0, sidenote);
      return;
    }
    anchor = parent;
  }
  throw new Error("Typst footnote sidenote requires a flow-content insertion point");
}

function firstDescendant(node, predicate) {
  let found;
  walk(node, (candidate) => {
    if (!found && predicate(candidate)) found = candidate;
  });
  return found;
}

function isGeneratedEquationWrapper(node) {
  return elementName(node) === "div"
    && hasClass(node, EQUATION_WRAPPER_CLASS)
    && attrs(node).get(EQUATION_WRAPPER_ATTRIBUTE) === "generated";
}

function isInsideDocumentToc(node) {
  for (let ancestor = node.parentNode; ancestor; ancestor = ancestor.parentNode) {
    if (elementName(ancestor) === "nav" && attrs(ancestor).get("role") === "doc-toc") return true;
  }
  return false;
}

function isInsideDocumentFootnotes(node) {
  for (let ancestor = node.parentNode; ancestor; ancestor = ancestor.parentNode) {
    if (elementName(ancestor) === "section" && attrs(ancestor).get("role") === "doc-endnotes") return true;
  }
  return false;
}

function reserveGeneratedId(usedIds, id) {
  if (usedIds.has(id)) throw new Error(`Generated footnote id collides with document id: ${id}`);
  usedIds.add(id);
  return id;
}

function collectNodes(node, predicate) {
  const found = [];
  walk(node, (candidate) => {
    if (predicate(candidate)) found.push(candidate);
  });
  return found;
}

function footnoteReferences(root) {
  return collectNodes(root, (node) => elementName(node) === "sup"
    && attrs(node).get("role") === "doc-noteref"
    && !isInsideDocumentFootnotes(node));
}

function nodesById(root) {
  const found = new Map();
  walk(root, (node) => {
    const id = attrs(node).get("id");
    if (id) found.set(id, node);
  });
  return found;
}

function fragmentTarget(link, idMap, label) {
  const href = attrs(link).get("href");
  if (!href?.startsWith("#") || !idMap.has(href.slice(1))) throw new Error(`${label} must target an existing document fragment`);
  return idMap.get(href.slice(1));
}

function requireVisibleFootnoteContent(node, className, label) {
  const content = firstDescendant(node, (candidate) => hasClass(candidate, className));
  if (!content || !textContent(content).trim()) throw new Error(`${label} must contain visible footnote content`);
  return content;
}

function validateLegacyFootnotes(root, section, references) {
  const idMap = nodesById(root);
  const list = firstDescendant(section, (node) => elementName(node) === "ol");
  if (!list) throw new Error("Legacy footnotes section must contain an ordered list");
  const notes = (list.childNodes ?? []).filter((node) => elementName(node) === "li");
  if (notes.length === 0 || references.length !== notes.length) throw new Error("Legacy footnotes must pair every reference with one note");
  const referencedNotes = new Set();
  for (const reference of references) {
    if (!hasClass(reference, "sk-docs-footnote-ref") || !attrs(reference).get("id")) throw new Error("Legacy footnote reference is incomplete");
    const link = firstDescendant(reference, (node) => elementName(node) === "a");
    const note = link ? fragmentTarget(link, idMap, "Legacy footnote reference") : undefined;
    if (!note || !notes.includes(note)) throw new Error("Legacy footnote reference must target its endnote");
    referencedNotes.add(note);
    const wrapper = reference.parentNode;
    const sidenote = wrapper && firstDescendant(wrapper, (node) => hasClass(node, "sk-docs-sidenote"));
    if (!sidenote || !attrs(sidenote).get("id")) throw new Error("Legacy footnote reference must include a sidenote");
    requireVisibleFootnoteContent(sidenote, "sk-docs-sidenote-content", "Legacy sidenote");
  }
  if (referencedNotes.size !== notes.length) throw new Error("Legacy footnotes contain an unreferenced note");
  for (const note of notes) {
    if (!hasClass(note, "sk-docs-footnote-item") || !attrs(note).get("id")) throw new Error("Legacy endnote is incomplete");
    requireVisibleFootnoteContent(note, "sk-docs-footnote-content", "Legacy endnote");
    const backlinks = collectNodes(note, (node) => elementName(node) === "a" && attrs(node).get("role") === "doc-backlink");
    if (backlinks.length !== 1 || fragmentTarget(backlinks[0], idMap, "Legacy footnote backlink") !== references[notes.indexOf(note)]) {
      throw new Error("Legacy footnote backlink must target its reference");
    }
  }
}

function validateNormalizedFootnotes(root, section, references, namespace) {
  const idMap = nodesById(root);
  const list = firstDescendant(section, (node) => elementName(node) === "ol" && hasClass(node, "sk-docs-footnote-list"));
  if (!list) throw new Error("Normalized footnotes section must contain its ordered list");
  const notes = (list.childNodes ?? []).filter((node) => elementName(node) === "li");
  if (notes.length === 0 || references.length === 0) throw new Error("Normalized footnotes must contain at least one reference and note");
  const referencesByNote = new Map(notes.map((note) => [note, []]));
  const allSidenotes = collectNodes(root, (node) => hasClass(node, "sk-docs-sidenote") && !isInsideDocumentFootnotes(node));
  if (allSidenotes.length !== notes.length) throw new Error("Normalized footnotes must contain exactly one sidenote per note");

  for (const reference of references) {
    if (!hasClass(reference, "sk-docs-footnote-ref") || attrs(reference).get("tabindex") !== "-1") {
      throw new Error("Normalized footnote reference is incomplete");
    }
    const links = (reference.childNodes ?? []).filter((node) => elementName(node) === "a");
    const endnoteLink = links.find((node) => hasClass(node, "sk-docs-footnote-link--endnote"));
    const sidenoteLink = links.find((node) => hasClass(node, "sk-docs-footnote-link--sidenote"));
    if (links.length !== 2 || !endnoteLink || !sidenoteLink) throw new Error("Normalized footnote reference must expose endnote and sidenote links");
    const note = fragmentTarget(endnoteLink, idMap, "Normalized footnote reference");
    const sidenote = fragmentTarget(sidenoteLink, idMap, "Normalized sidenote reference");
    if (!referencesByNote.has(note)) throw new Error("Normalized footnote reference targets the wrong endnote");
    const number = notes.indexOf(note) + 1;
    const referenceIndex = referencesByNote.get(note).length + 1;
    const expectedSidenote = idMap.get(`${namespace}--sidenote-${number}`);
    if (attrs(reference).get("id") !== `${namespace}--footnote-ref-${number}-${referenceIndex}`
      || sidenote !== expectedSidenote
      || !hasClass(sidenote, "sk-docs-sidenote")
      || elementName(sidenote) !== "aside"
      || attrs(sidenote).get("role") !== "note"
      || attrs(sidenote).get("tabindex") !== "-1"
      || attrs(sidenote).get("data-sk-footnote-number") !== String(number)) {
      throw new Error("Normalized footnote reference targets the wrong note representation");
    }
    requireVisibleFootnoteContent(sidenote, "sk-docs-sidenote-content", "Normalized sidenote");
    referencesByNote.get(note).push({ reference, sidenote });
  }

  notes.forEach((note, noteIndex) => {
    const number = noteIndex + 1;
    if (!hasClass(note, "sk-docs-footnote-item") || attrs(note).get("id") !== `${namespace}--footnote-${number}` || attrs(note).get("tabindex") !== "-1") {
      throw new Error(`Normalized endnote ${number} is incomplete`);
    }
    requireVisibleFootnoteContent(note, "sk-docs-footnote-content", `Normalized endnote ${number}`);
    const noteReferences = referencesByNote.get(note);
    if (noteReferences.length === 0) throw new Error(`Normalized endnote ${number} has no reference`);
    const uniqueSidenotes = [...new Set(noteReferences.map(({ sidenote }) => sidenote))];
    if (uniqueSidenotes.length !== 1 || uniqueSidenotes[0] !== idMap.get(`${namespace}--sidenote-${number}`)) {
      throw new Error(`Normalized endnote ${number} must have exactly one sidenote`);
    }
    const backlinks = collectNodes(note, (node) => elementName(node) === "a" && attrs(node).get("role") === "doc-backlink");
    if (backlinks.length !== noteReferences.length) throw new Error(`Normalized endnote ${number} must link back to every reference`);
    backlinks.forEach((backlink, referenceIndex) => {
      if (fragmentTarget(backlink, idMap, "Normalized footnote backlink") !== noteReferences[referenceIndex].reference) {
        throw new Error(`Normalized endnote ${number} backlink order is invalid`);
      }
    });
  });
}

function normalizeNativeFootnotes(root, {
  namespace,
  usedIds,
  title,
  referenceLabel,
  backreferenceLabel,
}) {
  const references = footnoteReferences(root);
  const sections = [];
  walk(root, (node) => {
    if (elementName(node) === "section" && attrs(node).get("role") === "doc-endnotes") sections.push(node);
  });
  if (sections.length === 0) {
    if (references.length > 0) throw new Error("Typst footnote reference requires a document endnotes section");
    return;
  }
  if (sections.length > 1) throw new Error("Typst HTML must emit at most one endnotes section per document");

  const section = sections[0];
  const normalizedClass = hasClass(section, FOOTNOTE_SECTION_CLASS);
  const normalizedMarker = attrs(section).get(FOOTNOTE_NORMALIZED_ATTRIBUTE);
  if (normalizedMarker && normalizedMarker !== "normalized") throw new Error("Footnotes section has an unknown normalization marker");
  if (normalizedMarker === "normalized" && !normalizedClass) throw new Error("Normalized footnotes marker requires its structural class");
  if (normalizedMarker === "normalized") {
    validateNormalizedFootnotes(root, section, references, namespace);
    return;
  }
  if (normalizedClass) {
    validateLegacyFootnotes(root, section, references);
    return;
  }
  const list = firstDescendant(section, (node) => elementName(node) === "ol");
  if (!list) throw new Error("Typst endnotes section must contain an ordered list");
  const notes = (list.childNodes ?? []).filter((node) => elementName(node) === "li");
  if (notes.length === 0) throw new Error("Typst endnotes section must contain at least one note");

  const notesBySourceId = new Map();
  for (const note of notes) {
    const sourceId = attrs(note).get("id");
    if (!sourceId) throw new Error("Typst endnote must have an id");
    notesBySourceId.set(sourceId, note);
  }

  const referencesByNote = new Map(notes.map((note) => [note, []]));
  for (const node of references) {
    const link = firstDescendant(node, (candidate) => elementName(candidate) === "a");
    const href = link ? attrs(link).get("href") : undefined;
    if (!href?.startsWith("#")) throw new Error("Typst footnote reference must link to an endnote fragment");
    const note = notesBySourceId.get(href.slice(1));
    if (!note) throw new Error(`Typst footnote reference targets a missing endnote: ${href}`);
    referencesByNote.get(note).push(node);
  }

  addClass(section, FOOTNOTE_SECTION_CLASS);
  setAttr(section, FOOTNOTE_NORMALIZED_ATTRIBUTE, "normalized");
  addClass(list, "sk-docs-footnote-list");
  const titleNode = htmlElement('<h2 class="sk-docs-footnotes-title"></h2>');
  setChildren(titleNode, [textNode(title)]);
  section.childNodes.unshift(titleNode);
  titleNode.parentNode = section;

  notes.forEach((note, noteIndex) => {
    const number = noteIndex + 1;
    const references = referencesByNote.get(note);
    if (references.length === 0) throw new Error(`Typst endnote ${number} has no reference`);
    const noteId = reserveGeneratedId(usedIds, `${namespace}--footnote-${number}`);
    const sidenoteId = reserveGeneratedId(usedIds, `${namespace}--sidenote-${number}`);
    const originalContent = removeMatchingNodes(note.childNodes ?? [], (node) => elementName(node) === "sup" && attrs(node).get("role") === "doc-backlink");
    if (!textContent({ childNodes: originalContent }).trim()) throw new Error(`Typst endnote ${number} has no visible content`);
    const sidenoteBodyNodes = sidenoteContentNodes(originalContent, sidenoteId, usedIds);

    addClass(note, "sk-docs-footnote-item");
    setAttr(note, "id", noteId);
    setAttr(note, "tabindex", "-1");
    const noteContent = htmlElement('<div class="sk-docs-footnote-content"></div>');
    setChildren(noteContent, originalContent);
    const backlinks = htmlElement('<span class="sk-docs-footnote-backlinks"></span>');

    references.forEach((reference, referenceIndex) => {
      const referenceId = reserveGeneratedId(usedIds, `${namespace}--footnote-ref-${number}-${referenceIndex + 1}`);
      const numberText = textContent(reference).replaceAll(/\s+/g, " ").trim() || String(number);
      addClass(reference, "sk-docs-footnote-ref");
      setAttr(reference, "id", referenceId);
      setAttr(reference, "tabindex", "-1");

      const endnoteLink = htmlElement('<a class="sk-docs-footnote-link sk-docs-footnote-link--endnote"></a>');
      setAttr(endnoteLink, "href", `#${noteId}`);
      setAttr(endnoteLink, "aria-label", `${referenceLabel} ${number}`);
      setChildren(endnoteLink, [textNode(numberText)]);
      const sidenoteLink = htmlElement('<a class="sk-docs-footnote-link sk-docs-footnote-link--sidenote"></a>');
      setAttr(sidenoteLink, "href", `#${sidenoteId}`);
      setAttr(sidenoteLink, "aria-label", `${referenceLabel} ${number}`);
      setChildren(sidenoteLink, [textNode(numberText)]);
      setChildren(reference, [endnoteLink, sidenoteLink]);

      const wrapper = htmlElement('<span class="sk-docs-footnote-wrapper"></span>');
      const parent = reference.parentNode;
      const referencePosition = parent?.childNodes?.indexOf(reference) ?? -1;
      if (!parent || referencePosition < 0) throw new Error("Typst footnote reference must have a serializable parent");
      wrapper.parentNode = parent;
      setChildren(wrapper, [reference]);
      parent.childNodes.splice(referencePosition, 1, wrapper);
      if (referenceIndex === 0) {
        const sidenote = htmlElement('<aside class="sk-docs-sidenote" role="note"></aside>');
        setAttr(sidenote, "id", sidenoteId);
        setAttr(sidenote, "tabindex", "-1");
        setAttr(sidenote, "aria-label", `${referenceLabel} ${number}`);
        setAttr(sidenote, "data-sk-footnote-number", String(number));
        const sidenoteNumber = htmlElement('<span class="sk-docs-sidenote-number"></span>');
        setChildren(sidenoteNumber, [textNode(number)]);
        const sidenoteBody = htmlElement('<div class="sk-docs-sidenote-content"></div>');
        setChildren(sidenoteBody, cloneHtmlNodes(sidenoteBodyNodes));
        setChildren(sidenote, [sidenoteNumber, sidenoteBody]);
        insertSidenoteBeforeReferenceBlock(reference, sidenote);
      }

      const backlink = htmlElement('<a class="sk-docs-footnote-backref" role="doc-backlink">↩</a>');
      setAttr(backlink, "href", `#${referenceId}`);
      setAttr(backlink, "aria-label", references.length === 1
        ? `${backreferenceLabel} ${number}`
        : `${backreferenceLabel} ${number}.${referenceIndex + 1}`);
      backlink.parentNode = backlinks;
      backlinks.childNodes.push(backlink);
    });

    setChildren(note, [noteContent, backlinks]);
  });
}

function wrapBlockEquations(root, equationLabel) {
  const equations = [];
  walk(root, (node) => {
    if (elementName(node) === "math" && attrs(node).get("display") === "block") equations.push(node);
  });
  for (const equation of equations) {
    let wrapper = equation.parentNode;
    if (!isGeneratedEquationWrapper(wrapper)) {
      const parent = equation.parentNode;
      const index = parent?.childNodes?.indexOf(equation) ?? -1;
      if (!parent || index < 0) throw new Error("Block MathML must have a serializable parent");
      const parentName = elementName(parent);
      if (parent.nodeName !== "#document-fragment" && !EQUATION_FLOW_CONTAINERS.has(parentName)) {
        throw new Error(`Block MathML cannot be wrapped safely inside <${parentName ?? parent.nodeName}> content`);
      }
      wrapper = parseFragment(`<div class="${EQUATION_WRAPPER_CLASS}"></div>`).childNodes[0];
      wrapper.parentNode = parent;
      wrapper.childNodes = [equation];
      equation.parentNode = wrapper;
      parent.childNodes.splice(index, 1, wrapper);
    }
    setAttr(wrapper, EQUATION_WRAPPER_ATTRIBUTE, "generated");
    setAttr(wrapper, "tabindex", "0");
    setAttr(wrapper, "role", "group");
    setAttr(wrapper, "aria-label", equationLabel);
  }
}

export function decorateHtmlFragment(fragment, {
  namespace,
  outlineMinLevel = 2,
  outlineMaxLevel = 4,
  equationLabel = "Scrollable mathematical formula",
  footnoteTitle = "Footnotes",
  footnoteReferenceLabel = "Footnote",
  footnoteBackreferenceLabel = "Back to footnote reference",
} = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(namespace ?? "")) throw new Error("HTML decoration namespace must be a lowercase identifier");
  if (!Number.isInteger(outlineMinLevel) || !Number.isInteger(outlineMaxLevel) || outlineMinLevel < 1 || outlineMaxLevel > 6 || outlineMinLevel > outlineMaxLevel) {
    throw new Error("HTML outline levels must be integers between 1 and 6");
  }
  if (typeof equationLabel !== "string" || !equationLabel.trim()) throw new Error("HTML equation label must be a non-empty string");
  for (const [field, value] of Object.entries({ footnoteTitle, footnoteReferenceLabel, footnoteBackreferenceLabel })) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  }

  const parseErrors = [];
  const root = parseFragment(fragment, { onParseError: (error) => parseErrors.push(error.code) });
  if (parseErrors.length) throw new Error(`HTML decoration input has ${parseErrors.length} parse error(s): ${parseErrors.join(", ")}`);

  const usedIds = new Set();
  walk(root, (node) => {
    const id = attrs(node).get("id");
    if (!id) return;
    if (usedIds.has(id)) throw new Error(`HTML decoration input contains duplicate id: ${id}`);
    usedIds.add(id);
  });

  const headingPath = [];
  const items = [];
  walk(root, (node) => {
    const match = /^h([1-6])$/.exec(elementName(node) ?? "");
    if (!match || isInsideDocumentToc(node) || isInsideDocumentFootnotes(node)) return;
    const level = Number(match[1]);
    const text = textContent(node).replaceAll(/\s+/g, " ").trim();
    if (!text) throw new Error(`HTML heading h${level} must have visible text`);
    headingPath.length = level - 1;
    headingPath[level - 1] = text;

    const attributes = attrs(node);
    let id = attributes.get("id");
    let anchorSource = attributes.get(GENERATED_ANCHOR_ATTRIBUTE) === "generated" ? "generated" : "source";
    if (!id) {
      anchorSource = "generated";
      const base = `${namespace}-${headingSlug(text)}`;
      id = base;
      if (usedIds.has(id)) id = `${base}-${sha256(headingPath.join(" > ")).slice(0, 8)}`;
      let ordinal = 2;
      const uniqueBase = id;
      while (usedIds.has(id)) id = `${uniqueBase}-${ordinal++}`;
      setAttr(node, "id", id);
      setAttr(node, GENERATED_ANCHOR_ATTRIBUTE, "generated");
      usedIds.add(id);
    }

    if (level >= outlineMinLevel && level <= outlineMaxLevel) items.push({ id, level, text, anchorSource });
  });

  normalizeNativeFootnotes(root, {
    namespace,
    usedIds,
    title: footnoteTitle,
    referenceLabel: footnoteReferenceLabel,
    backreferenceLabel: footnoteBackreferenceLabel,
  });
  wrapBlockEquations(root, equationLabel);
  return {
    body: serialize(root).trim(),
    outline: {
      version: "document-outline-v1",
      namespace,
      minLevel: outlineMinLevel,
      maxLevel: outlineMaxLevel,
      items,
    },
  };
}

export function validateDocumentOutline(outline, {
  namespace,
  minLevel = 2,
  maxLevel = 4,
} = {}) {
  const errors = [];
  if (outline?.version !== "document-outline-v1") errors.push("outline.version must be document-outline-v1");
  if (outline?.namespace !== namespace) errors.push(`outline.namespace must be ${namespace}`);
  if (outline?.minLevel !== minLevel) errors.push(`outline.minLevel must be ${minLevel}`);
  if (outline?.maxLevel !== maxLevel) errors.push(`outline.maxLevel must be ${maxLevel}`);
  if (!Array.isArray(outline?.items)) return [...errors, "outline.items must be an array"];
  const ids = new Set();
  let previousLevel;
  for (const item of outline.items) {
    if (typeof item?.id !== "string" || !/^[\p{Letter}\p{Number}\p{Mark}_.:-]+$/u.test(item.id)) errors.push("outline item id must use fragment-safe characters");
    else if (ids.has(item.id)) errors.push(`outline item id is duplicated: ${item.id}`);
    else ids.add(item.id);
    if (!Number.isInteger(item?.level) || item.level < minLevel || item.level > maxLevel) errors.push(`outline item ${item?.id ?? "<unknown>"} has an invalid level`);
    if (previousLevel !== undefined && item.level > previousLevel + 1) errors.push(`outline item ${item.id} skips a heading level`);
    previousLevel = item.level;
    if (typeof item?.text !== "string" || !item.text.trim()) errors.push(`outline item ${item?.id ?? "<unknown>"} has no text`);
    if (!["source", "generated"].includes(item?.anchorSource)) errors.push(`outline item ${item?.id ?? "<unknown>"} has an invalid anchorSource`);
  }
  return errors;
}

function auditCss(css, field, errors) {
  const normalized = css.toLowerCase().replaceAll(/\s+/g, "");
  if (css.includes("<")) errors.push(`${field} contains an HTML delimiter`);
  if (css.includes("\\")) errors.push(`${field} contains a CSS escape`);
  if (normalized.includes("@import")) errors.push(`${field} contains @import`);
  if (normalized.includes("expression(")) errors.push(`${field} contains expression()`);
  if (/url\(["']?(?:javascript|vbscript|file):/i.test(normalized)) errors.push(`${field} contains a dangerous URL`);
  for (const match of normalized.matchAll(/url\(([^)]*)\)/g)) {
    const value = match[1].replace(/^['"]|['"]$/g, "");
    if (!/^#[a-z_][\w:.-]*$/i.test(value)) errors.push(`${field} contains a non-fragment CSS URL`);
  }
}

export function auditGeneratedCss(style) {
  const errors = [];
  if (typeof style !== "string") return ["compiler CSS must be a string"];
  auditCss(style, "compiler CSS", errors);
  let root;
  try {
    root = postcss.parse(style);
  } catch (error) {
    errors.push(`compiler CSS could not be parsed: ${error.reason ?? error.message}`);
    return errors;
  }
  root.walkAtRules((rule) => errors.push(`compiler CSS contains unsupported @${rule.name}`));
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    for (const selector of rule.selectors ?? []) {
      if (selector !== ".sk-docs-rendered" && !selector.startsWith(".sk-docs-rendered ")) {
        errors.push(`compiler CSS selector is not scoped: ${selector}`);
      }
    }
  });
  return errors;
}

export function scopeGeneratedCss(style) {
  const errors = [];
  auditCss(style, "compiler CSS", errors);
  if (errors.length) throw new Error(errors.join("\n"));
  const root = postcss.parse(style);
  const atRules = [];
  root.walkAtRules((rule) => atRules.push(rule.name));
  if (atRules.length) throw new Error(`compiler CSS contains unsupported at-rules: ${atRules.map((name) => `@${name}`).join(", ")}`);
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    rule.selectors = (rule.selectors ?? []).map((selector) => {
      const trimmed = selector.trim();
      if ([":root", "html", "body"].includes(trimmed)) return ".sk-docs-rendered";
      if (trimmed === ".sk-docs-rendered" || trimmed.startsWith(".sk-docs-rendered ")) return trimmed;
      return `.sk-docs-rendered ${trimmed}`;
    });
  });
  const scoped = root.toString().trim();
  const scopedErrors = auditGeneratedCss(scoped);
  if (scopedErrors.length) throw new Error(scopedErrors.join("\n"));
  return scoped;
}

function auditUrl(value, field, errors, nestedAudits) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const compact = trimmed.replaceAll(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (/^(?:javascript|vbscript|file):/i.test(compact) || /^[a-z]:[\\/]/i.test(compact) || compact.startsWith("\\\\")) {
    errors.push(`${field} contains a dangerous or local URL`);
    return;
  }
  if (/^data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;base64)?,/i.test(compact)) {
    const comma = compact.indexOf(",");
    const header = compact.slice(0, comma);
    const payload = compact.slice(comma + 1);
    const svg = header.toLowerCase().includes(";base64")
      ? Buffer.from(payload, "base64").toString("utf8")
      : decodeURIComponent(payload);
    if (Buffer.byteLength(svg) > 1_000_000) {
      errors.push(`${field} embeds an SVG larger than 1 MB`);
      return;
    }
    const nested = auditHtmlFragment(svg, { embeddedSvg: true });
    nestedAudits.push(nested);
    for (const error of nested.errors) errors.push(`${field} embedded SVG: ${error}`);
    return;
  }
  if (/^data:/i.test(compact) && !/^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i.test(compact)) {
    errors.push(`${field} uses an unsupported data URL`);
  }
}

function figureHasContent(figure) {
  let meaningful = false;
  const svgHasGraphics = (svg) => {
    let found = false;
    walk(svg, (node) => {
      if (node !== svg && SVG_GRAPHIC_ELEMENTS.has(elementName(node))) found = true;
    });
    return found;
  };
  const elementHasSubstance = (node, name) => {
    if (!FIGURE_CONTENT_ELEMENTS.has(name)) return false;
    if (name === "img") return Boolean(attrs(node).get("src")?.trim());
    if (name === "svg") return svgHasGraphics(node);
    return true;
  };
  const visit = (node, insideCaption = false) => {
    const name = elementName(node);
    const caption = insideCaption || name === "figcaption";
    if (!caption && elementHasSubstance(node, name)) meaningful = true;
    for (const child of node.childNodes ?? []) visit(child, caption);
  };
  visit(figure);
  return meaningful;
}

export function auditHtmlFragment(fragment, { embeddedSvg = false } = {}) {
  const parseErrors = [];
  const root = parseFragment(fragment, { onParseError: (error) => parseErrors.push(error.code) });
  const errors = [];
  const nestedAudits = [];
  const counters = {
    figures: 0,
    emptyFigures: 0,
    headings: 0,
    maxHeadingLevel: 0,
    links: 0,
    images: 0,
    imagesWithoutAlt: 0,
    inlineSvgs: 0,
    math: 0,
    unsafeElements: 0,
    unsafeAttributes: 0,
    unsafeUrls: 0,
  };

  walk(root, (node) => {
    const name = elementName(node);
    if (!name) return;
    const attributes = attrs(node);
    if (FORBIDDEN_ELEMENTS.has(name)) {
      counters.unsafeElements += 1;
      errors.push(`forbidden <${name}> element`);
    }
    for (const [attribute, value] of attributes) {
      if (attribute.startsWith("on") || attribute === "srcdoc") {
        counters.unsafeAttributes += 1;
        errors.push(`<${name}> contains forbidden ${attribute}`);
      }
      if (attribute === "style") auditCss(value, `<${name}> style`, errors);
      if (URL_ATTRIBUTES.has(attribute)) {
        const before = errors.length;
        if (attribute === "srcset") errors.push(`<${name}> srcset is not supported in authoritative content`);
        else auditUrl(value, `<${name}> ${attribute}`, errors, nestedAudits);
        if (errors.length > before) counters.unsafeUrls += 1;
      }
    }
    if (name === "figure") {
      counters.figures += 1;
      if (!figureHasContent(node)) counters.emptyFigures += 1;
    }
    const headingMatch = /^h([1-6])$/.exec(name);
    if (headingMatch) {
      counters.headings += 1;
      counters.maxHeadingLevel = Math.max(counters.maxHeadingLevel, Number(headingMatch[1]));
    }
    if (attributes.get("role") === "heading") {
      const level = Number(attributes.get("aria-level"));
      counters.headings += 1;
      if (Number.isInteger(level)) counters.maxHeadingLevel = Math.max(counters.maxHeadingLevel, level);
    }
    if (name === "a") counters.links += 1;
    if (name === "img") {
      counters.images += 1;
      if (!attributes.has("alt")) counters.imagesWithoutAlt += 1;
    }
    if (name === "svg") counters.inlineSvgs += 1;
    if (name === "math") counters.math += 1;
  });

  for (const nested of nestedAudits) {
    counters.unsafeElements += nested.unsafeElements;
    counters.unsafeAttributes += nested.unsafeAttributes;
    counters.unsafeUrls += nested.unsafeUrls;
  }
  if (parseErrors.length) errors.push(`HTML parser reported ${parseErrors.length} error(s)`);
  return {
    parser: PARSER,
    parseErrors: parseErrors.length,
    ...counters,
    sha256: sha256(Buffer.from(fragment, "utf8")),
    errors,
  };
}

export function extractHtmlDocument(document) {
  const parseErrors = [];
  const root = parse(document, { onParseError: (error) => parseErrors.push(error.code) });
  let head;
  let body;
  walk(root, (node) => {
    if (node.tagName === "head") head = node;
    if (node.tagName === "body") body = node;
  });
  if (!head || !body) throw new Error("Typst HTML output must contain head and body elements");
  if (parseErrors.length) throw new Error(`Typst HTML output has ${parseErrors.length} parse error(s): ${parseErrors.join(", ")}`);

  const styles = [];
  for (const node of head.childNodes ?? []) {
    if (node.tagName === "style") styles.push((node.childNodes ?? []).map((child) => child.value ?? "").join("").trim());
  }
  const style = scopeGeneratedCss(styles.filter(Boolean).join("\n\n"));

  const fragment = (body.childNodes ?? []).map((node) => serializeOuter(node)).join("\n").trim();
  if (!fragment) throw new Error("Typst HTML output body is empty");
  return { style, body: fragment };
}

function diagnosticCode(message) {
  if (message === EXPERIMENTAL_WARNING) return "html-export-experimental";
  if (message.includes("page set rule was ignored")) return "page-set-ignored";
  if (message.includes("pagebreak was ignored")) return "pagebreak-ignored";
  if (message.includes("heading of level") && message.includes("aria-level")) return "heading-level-unsupported";
  const ignored = /^(\w+) was ignored during HTML export/.exec(message);
  if (ignored) return `${ignored[1].toLowerCase()}-ignored`;
  return "unknown-warning";
}

export function analyzeTypstDiagnostics(stderr, policy) {
  const plain = stderr.replaceAll(/\x1b\[[0-9;]*m/g, "");
  const counts = new Map();
  for (const rawLine of plain.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const warning = line.match(/(?:^|:\s)warning:\s(.+)$/);
    if (warning) {
      const code = diagnosticCode(warning[1]);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  const reported = [...counts].sort(([left], [right]) => compareCodePoints(left, right)).map(([code, count]) => ({ code, count }));
  const blocked = policy === "worldbook-strict-v1"
    ? reported.filter(({ code }) => code !== "html-export-experimental")
    : [];
  return {
    policy,
    reported,
    warningCount: reported.reduce((total, entry) => total + entry.count, 0),
    blockedCount: blocked.reduce((total, entry) => total + entry.count, 0),
  };
}

export function validateDiagnosticSummary(summary, expectedPolicy) {
  const errors = [];
  if (summary?.policy !== expectedPolicy) errors.push(`diagnostics.policy must be ${expectedPolicy}`);
  if (!Array.isArray(summary?.reported)) return [...errors, "diagnostics.reported must be an array"];
  const expectedOrder = [...summary.reported].sort((left, right) => compareCodePoints(left.code, right.code));
  if (canonicalJson(expectedOrder) !== canonicalJson(summary.reported)) errors.push("diagnostics.reported must be sorted by code");
  const codes = new Set();
  let warningCount = 0;
  let blockedCount = 0;
  for (const entry of summary.reported) {
    if (!/^[a-z][a-z0-9-]*$/.test(entry?.code ?? "")) errors.push("diagnostic code is invalid");
    if (!Number.isInteger(entry?.count) || entry.count <= 0) errors.push(`diagnostic ${entry?.code ?? "<unknown>"} count must be a positive integer`);
    if (codes.has(entry?.code)) errors.push(`diagnostic code is duplicated: ${entry.code}`);
    codes.add(entry?.code);
    if (Number.isInteger(entry?.count) && entry.count > 0) {
      warningCount += entry.count;
      if (expectedPolicy === "worldbook-strict-v1" && entry.code !== "html-export-experimental") blockedCount += entry.count;
    }
  }
  if (summary.warningCount !== warningCount) errors.push("diagnostics.warningCount does not match reported warnings");
  if (summary.blockedCount !== blockedCount) errors.push("diagnostics.blockedCount does not match policy evaluation");
  return errors;
}

function dependencyIdentity(absolutePath, sourceRoot) {
  const relative = path.relative(sourceRoot, absolutePath);
  if (relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return { id: `source/${relative.replaceAll("\\", "/")}`, type: "source" };
  }
  const portable = absolutePath.replaceAll("\\", "/");
  const packageMatch = /\/typst\/packages\/(preview|local)\/([^/]+)\/([^/]+)\/(.+)$/i.exec(portable);
  if (packageMatch) {
    const [, namespace, name, version, packagePath] = packageMatch;
    return {
      id: `package/@${namespace.toLowerCase()}/${name}:${version}/${packagePath}`,
      type: "package",
      package: `@${namespace.toLowerCase()}/${name}:${version}`,
    };
  }
  throw new Error(`Typst dependency is outside the authority repository and package cache: ${absolutePath}`);
}

export async function summarizeTypstDependencies({ zeroBytes, sourceRoot }) {
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(zeroBytes);
  const rawInputs = decoded.split("\0").filter(Boolean);
  const canonicalRoot = await realpath(sourceRoot);
  const entries = [];
  for (const rawInput of rawInputs) {
    const absolutePath = await realpath(stripWindowsNamespace(rawInput));
    const identity = dependencyIdentity(absolutePath, canonicalRoot);
    entries.push({ path: identity.id, sha256: await fileDigest(absolutePath), type: identity.type, package: identity.package });
  }
  entries.sort((left, right) => compareCodePoints(left.path, right.path));
  const unique = entries.filter((entry, index) => index === 0 || entry.path !== entries[index - 1].path);
  const packages = [...new Set(unique.map((entry) => entry.package).filter(Boolean))].sort(compareCodePoints);
  const inputs = unique.map(({ package: _package, ...entry }) => entry);
  return {
    format: "typst-deps-v1",
    inputs,
    packages,
    sourceFiles: inputs.filter((entry) => entry.type === "source").length,
    packageFiles: inputs.filter((entry) => entry.type === "package").length,
    sha256: sha256(Buffer.from(canonicalJson(inputs), "utf8")),
  };
}

async function collectFiles(root, directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(root, absolute, files);
    else if (entry.isFile() && /\.(?:otf|ttc|ttf|woff2?)$/i.test(entry.name)) files.add(await realpath(absolute));
  }
}

export async function summarizeFontInputs({ sourceRoot, fontPaths, policy }) {
  const files = new Set();
  for (const fontPath of fontPaths) await collectFiles(sourceRoot, await realpath(fontPath), files);
  const canonicalRoot = await realpath(sourceRoot);
  const inputs = [];
  for (const absolute of files) {
    const identity = dependencyIdentity(absolute, canonicalRoot);
    inputs.push({ path: identity.id, sha256: await fileDigest(absolute) });
  }
  inputs.sort((left, right) => compareCodePoints(left.path, right.path));
  return {
    policy,
    inputs,
    sha256: sha256(Buffer.from(canonicalJson(inputs), "utf8")),
  };
}

export function validateDependencySummary(summary, { fontPolicy, requireFonts = false } = {}) {
  const errors = [];
  if (summary?.format !== "typst-deps-v1") errors.push("dependencies.format must be typst-deps-v1");
  if (!Array.isArray(summary?.inputs)) errors.push("dependencies.inputs must be an array");
  else {
    const expectedOrder = [...summary.inputs].sort((left, right) => compareCodePoints(left.path, right.path));
    if (canonicalJson(expectedOrder) !== canonicalJson(summary.inputs)) errors.push("dependencies.inputs must be sorted by path");
    const paths = new Set();
    for (const input of summary.inputs) {
      if (!input || !["source", "package"].includes(input.type)) errors.push("dependency input type must be source or package");
      if (typeof input?.path !== "string" || !input.path.startsWith(`${input.type}/`)) errors.push("dependency input path does not match its type");
      if (!/^[a-f0-9]{64}$/.test(input?.sha256 ?? "")) errors.push(`dependency ${input?.path ?? "<unknown>"} has an invalid sha256`);
      if (paths.has(input?.path)) errors.push(`dependency path is duplicated: ${input.path}`);
      paths.add(input?.path);
    }
    const digest = sha256(Buffer.from(canonicalJson(summary.inputs), "utf8"));
    if (digest !== summary.sha256) errors.push("dependencies.sha256 does not match inputs");
    const sourceFiles = summary.inputs.filter((entry) => entry.type === "source").length;
    const packageFiles = summary.inputs.filter((entry) => entry.type === "package").length;
    if (summary.sourceFiles !== sourceFiles) errors.push("dependencies.sourceFiles does not match inputs");
    if (summary.packageFiles !== packageFiles) errors.push("dependencies.packageFiles does not match inputs");
    const packages = [...new Set(summary.inputs.flatMap((entry) => {
      const match = /^package\/(@(?:preview|local)\/[^:]+:[^/]+)\//.exec(entry.path);
      return match ? [match[1]] : [];
    }))].sort(compareCodePoints);
    if (canonicalJson(summary.packages) !== canonicalJson(packages)) errors.push("dependencies.packages does not match package inputs");
  }
  if (!summary?.fonts || !Array.isArray(summary.fonts.inputs)) errors.push("dependencies.fonts.inputs must be an array");
  else {
    if (!["repository-only", "system-allowed"].includes(summary.fonts.policy)) errors.push("dependencies.fonts.policy is invalid");
    if (fontPolicy && summary.fonts.policy !== fontPolicy) errors.push(`dependencies.fonts.policy must be ${fontPolicy}`);
    if (requireFonts && summary.fonts.inputs.length === 0) errors.push("dependencies.fonts.inputs must not be empty");
    const expectedOrder = [...summary.fonts.inputs].sort((left, right) => compareCodePoints(left.path, right.path));
    if (canonicalJson(expectedOrder) !== canonicalJson(summary.fonts.inputs)) errors.push("dependencies.fonts.inputs must be sorted by path");
    for (const input of summary.fonts.inputs) {
      if (typeof input?.path !== "string" || !input.path.startsWith("source/")) errors.push("font input must be repository-relative");
      if (!/^[a-f0-9]{64}$/.test(input?.sha256 ?? "")) errors.push(`font ${input?.path ?? "<unknown>"} has an invalid sha256`);
    }
    const digest = sha256(Buffer.from(canonicalJson(summary.fonts.inputs), "utf8"));
    if (digest !== summary.fonts.sha256) errors.push("dependencies.fonts.sha256 does not match inputs");
  }
  return errors;
}

export function publicHtmlAudit(audit) {
  const { errors: _errors, ...value } = audit;
  return value;
}
