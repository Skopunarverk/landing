export type {
  AssetRef,
  BuildFingerprint,
  DocumentId,
  DocumentMeta,
  DocumentNamespace,
  OutputArtifact,
  PublicationMeta,
  ReferenceTarget,
  RenderTarget,
} from "./schema/publication";

export {
  assertPublicationMeta,
  validatePublicationMeta,
} from "./schema/publication";

export type {
  WorldbookChapter,
  WorldbookChapterStatus,
  WorldbookLicense,
  WorldbookPublication,
  WorldbookPublicationIndex,
  WorldbookPublicationMode,
  WorldbookVolume,
  WorldbookVolumeStatus,
} from "./schema/worldbook-publication";

export type {
  AuthoritativeContentV3,
  DocumentOutline,
  DocumentOutlineItem,
  GeneratedHtmlAudit,
  TypstDependencySummary,
  TypstDiagnosticPolicy,
  TypstDiagnosticSummary,
} from "./schema/authoritative-content";

export {
  assertWorldbookPublicationSource,
  generateWorldbookPublicationIndex,
  loadWorldbookPublicationIndex,
  parseLegacyWorldbookReadme,
  validateWorldbookPublication,
  validateWorldbookPublicationSource,
} from "./schema/worldbook-publication";
