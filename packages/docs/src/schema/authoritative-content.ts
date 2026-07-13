export type TypstDiagnosticPolicy = "worldbook-strict-v1" | "sevara-report-v1";

export interface TypstDiagnosticSummary {
  policy: TypstDiagnosticPolicy;
  reported: Array<{ code: string; count: number }>;
  warningCount: number;
  blockedCount: number;
}

export interface TypstDependencySummary {
  format: "typst-deps-v1";
  inputs: Array<{ path: string; sha256: string; type: "source" | "package" }>;
  packages: string[];
  sourceFiles: number;
  packageFiles: number;
  sha256: string;
  fonts: {
    policy: "repository-only" | "system-allowed";
    inputs: Array<{ path: string; sha256: string }>;
    sha256: string;
  };
}

export interface GeneratedHtmlAudit {
  parser: "parse5@7.3.0";
  parseErrors: number;
  figures: number;
  emptyFigures: number;
  headings: number;
  maxHeadingLevel: number;
  links: number;
  images: number;
  imagesWithoutAlt: number;
  inlineSvgs: number;
  math: number;
  unsafeElements: number;
  unsafeAttributes: number;
  unsafeUrls: number;
  sha256: string;
}

export interface DocumentOutlineItem {
  id: string;
  level: number;
  text: string;
  anchorSource: "source" | "generated";
}

export interface DocumentOutline {
  version: "document-outline-v1";
  namespace: string;
  minLevel: number;
  maxLevel: number;
  items: DocumentOutlineItem[];
}

export interface AuthoritativeContentV3 {
  schemaVersion: 3;
  product: string;
  canonicalPath: string;
  source: {
    repository: string;
    commit: string;
    path: string;
    entrySha256: string;
  };
  generator: { typst: string; docsContract: string };
  generatedAt: string;
  diagnostics: TypstDiagnosticSummary;
  dependencies: TypstDependencySummary;
  htmlAudit: GeneratedHtmlAudit;
  outline: DocumentOutline;
  style: string;
  body: string;
}
