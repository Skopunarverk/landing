import { brand, productById } from "@skopunarverk/brand";

export const siteConfig = {
  name: brand.name,
  displayName: brand.displayName,
  tagline: brand.tagline,
  description:
    "Sköpunarverk 项目群：从 TheWorldBook 世界设定、Sevara 魔法语言，到 ex_mmo_cluster 权威 MMO 世界运行时。",
  links: {
    github: brand.repository,
    worldBook: productById("worldbook").href,
    sevara: productById("sevara").href,
    runtime: productById("runtime").href,
  },
  versions: [
    { id: "v1", label: "原版", href: "/" },
    { id: "v2", label: "体素叙事版", href: "/v2" },
  ],
} as const;

export type SiteVersion = (typeof siteConfig.versions)[number]["id"];
