import type { Metadata } from "next";
import { headers } from "next/headers";
import "@skopunarverk/brand/tokens.css";
import "@skopunarverk/ui/styles.css";
import "./globals.css";
import { siteConfig } from "./lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0];
  const protocol = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = `${siteConfig.name}｜${siteConfig.tagline}`;
  const description = siteConfig.description;
  const socialImage = new URL("/og-skopunarverk.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    keywords: [siteConfig.name, "TheWorldBook", "Sevara", "MMO", "世界观", "魔法语言", "体素世界"],
    openGraph: {
      title,
      description: "世界设定、魔法语言与权威运行时，共同构成一个可生长的世界。",
      type: "website",
      locale: "zh_CN",
      url: metadataBase,
      images: [{ url: socialImage, width: 1730, height: 909, alt: `${siteConfig.name} 漂浮体素世界` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "世界设定、魔法语言与权威运行时，共同构成一个可生长的世界。",
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
