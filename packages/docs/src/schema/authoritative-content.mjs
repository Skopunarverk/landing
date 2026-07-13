import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { parse, parseFragment, serializeOuter } from "parse5";
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
