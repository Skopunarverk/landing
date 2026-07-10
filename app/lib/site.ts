export const siteConfig = {
  name: "Sköpunarverk",
  displayName: "SKÖPUNARVERK",
  tagline: "让世界被书写，也被运行",
  description:
    "Sköpunarverk 项目群：从 TheWorldBook 世界设定、Sevara 魔法语言，到 ex_mmo_cluster 权威 MMO 世界运行时。",
  links: {
    github: "https://github.com/Skopunarverk",
    worldBook: "https://github.com/Hemifuture/TheWorldBook",
    sevara: "https://github.com/dyzdyz010/sevara",
    runtime: "https://github.com/dyzdyz010/ex_mmo_cluster",
  },
  versions: [
    { id: "v1", label: "原版", href: "/" },
    { id: "v2", label: "体素叙事版", href: "/v2" },
  ],
} as const;

export type SiteVersion = (typeof siteConfig.versions)[number]["id"];
