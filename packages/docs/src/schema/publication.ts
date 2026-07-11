export type RenderTarget = "html" | "pdf";

export type DocumentId = string;
export type DocumentNamespace = string;

export interface DocumentMeta {
  id: DocumentId;
  namespace: DocumentNamespace;
  title: string;
  lang: string;
  description?: string;
  sourcePath?: string;
  canonicalPath?: string;
}

export interface PublicationMeta {
  document: DocumentMeta;
  sourceCommit: string;
  generatedAt: string;
  targets: RenderTarget[];
  artifacts: OutputArtifact[];
  fingerprint?: BuildFingerprint;
}

export interface AssetRef {
  source: string;
  webPath?: string;
  alt?: string;
  width?: string;
  height?: string;
}

export interface ReferenceTarget {
  documentId: DocumentId;
  anchor: string;
  href?: string;
}

export interface OutputArtifact {
  target: RenderTarget;
  path: string;
  sha256?: string;
  bytes?: number;
}

export interface BuildFingerprint {
  docsPackageVersion: string;
  typstVersion: string;
  sourceCommit: string;
  fontsHash?: string;
}

import {
  assertPublicationMeta as assertRuntimePublicationMeta,
  validatePublicationMeta as validateRuntimePublicationMeta,
} from "./publication.mjs";

export const validatePublicationMeta = validateRuntimePublicationMeta as (value: unknown) => string[];
export function assertPublicationMeta(value: unknown): asserts value is PublicationMeta {
  assertRuntimePublicationMeta(value);
}
