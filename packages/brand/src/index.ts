export const brand = {
  name: "Sköpunarverk",
  displayName: "SKÖPUNARVERK",
  tagline: "让世界被书写，也被运行",
  domain: "https://skopunarverk.com",
  repository: "https://github.com/Skopunarverk",
} as const;

export type ProductId = "landing" | "sevara" | "worldbook" | "runtime";

export type Product = {
  id: ProductId;
  name: string;
  shortName: string;
  href: string;
  description: string;
  status: "available" | "building" | "planned";
};

export const products: readonly Product[] = [
  {
    id: "landing",
    name: "Sköpunarverk",
    shortName: "Overview",
    href: "/",
    description: "项目群入口与共同世界概览",
    status: "available",
  },
  {
    id: "sevara",
    name: "Sevara",
    shortName: "Language",
    href: "/sevara/",
    description: "面向权威执行环境的魔法语言",
    status: "building",
  },
  {
    id: "worldbook",
    name: "TheWorldBook",
    shortName: "World",
    href: "/worldbook/",
    description: "世界设定、历史、文明与社会生活",
    status: "building",
  },
  {
    id: "runtime",
    name: "ex_mmo_cluster",
    shortName: "Runtime",
    href: "https://github.com/dyzdyz010/ex_mmo_cluster",
    description: "权威 MMO 世界运行时",
    status: "planned",
  },
] as const;

export function productById(id: ProductId): Product {
  const product = products.find((entry) => entry.id === id);
  if (!product) throw new Error(`Unknown Sköpunarverk product: ${id}`);
  return product;
}
