export type ContentFeatureVariant = "article" | "embed" | "excerpt";

export interface ContentFeatureOptions {
  toc?: boolean;
  headingLinks?: boolean;
  footnotes?: boolean;
  footnoteLayout?: "endnotes" | "sidenotes";
}
