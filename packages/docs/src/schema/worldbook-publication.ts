export type WorldbookVolumeStatus = "in-progress" | "planned";
export type WorldbookChapterStatus = "published" | "stub" | "planned";
export type WorldbookPublicationMode = "structured" | "legacy-readme";

export interface WorldbookLicense {
  spdx: string;
  name: string;
  url: string;
  copyright: string;
}

export interface WorldbookChapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  status: WorldbookChapterStatus;
  entry: string | null;
  webPath: string | null;
}

export interface WorldbookVolume {
  id: string;
  number: number;
  title: string;
  englishTitle: string;
  summary: string;
  status: WorldbookVolumeStatus;
  entry: string;
  chapters: WorldbookChapter[];
}

export interface WorldbookPublication {
  schemaVersion: 1;
  product: "worldbook";
  title: string;
  tagline: string;
  summary: string;
  license: WorldbookLicense;
  volumes: WorldbookVolume[];
}

export interface WorldbookPublicationIndex extends WorldbookPublication {
  source: {
    repository: string;
    commit: string;
    path: string;
    sha256: string;
    mode: WorldbookPublicationMode;
  };
}

import {
  assertWorldbookPublicationSource as assertRuntimeWorldbookPublicationSource,
  generateWorldbookPublicationIndex as generateRuntimeWorldbookPublicationIndex,
  loadWorldbookPublicationIndex as loadRuntimeWorldbookPublicationIndex,
  parseLegacyWorldbookReadme as parseRuntimeLegacyWorldbookReadme,
  validateWorldbookPublication as validateRuntimeWorldbookPublication,
  validateWorldbookPublicationSource as validateRuntimeWorldbookPublicationSource,
} from "./worldbook-publication.mjs";

export const validateWorldbookPublication = validateRuntimeWorldbookPublication as (value: unknown) => string[];
export const validateWorldbookPublicationSource = validateRuntimeWorldbookPublicationSource as (
  value: unknown,
  sourceRoot: string,
) => Promise<string[]>;
export const assertWorldbookPublicationSource = assertRuntimeWorldbookPublicationSource as (
  value: unknown,
  sourceRoot: string,
) => Promise<void>;
export const parseLegacyWorldbookReadme = parseRuntimeLegacyWorldbookReadme as (
  readme: string,
  sourceRoot: string,
) => Promise<WorldbookPublication>;
export const loadWorldbookPublicationIndex = loadRuntimeWorldbookPublicationIndex as (options: {
  sourceRoot: string;
  repository: string;
  commit: string;
  expectedMode: WorldbookPublicationMode;
}) => Promise<WorldbookPublicationIndex>;
export const generateWorldbookPublicationIndex = generateRuntimeWorldbookPublicationIndex as (options: {
  sourceRoot: string;
  repository: string;
  commit: string;
  expectedMode: WorldbookPublicationMode;
  outputPath?: string;
}) => Promise<WorldbookPublicationIndex>;
