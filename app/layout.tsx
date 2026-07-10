import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genesis｜让世界被书写，也被运行",
  description:
    "Genesis 项目群：从 TheWorldBook 世界设定、Sevara 魔法语言，到 ex_mmo_cluster 权威 MMO 世界运行时。",
  keywords: ["Genesis", "TheWorldBook", "Sevara", "MMO", "世界观", "魔法语言", "体素世界"],
  openGraph: {
    title: "Genesis｜让世界被书写，也被运行",
    description: "世界设定、魔法语言与权威运行时，共同构成一个可生长的世界。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genesis｜让世界被书写，也被运行",
    description: "世界设定、魔法语言与权威运行时，共同构成一个可生长的世界。",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
