import type { ReactNode } from "react";
import { siteConfig, type SiteVersion } from "@/app/lib/site";
import { ActionLink, cn, PageContainer } from "./ui";
import { VersionSwitcher } from "./VersionSwitcher";

type Visual = "classic" | "voxel";
type NavItem = { label: string; href: string };

const chromeStyles = {
  classic: {
    header: "relative z-50 border-b border-line bg-canvas/70 backdrop-blur-xl",
    inner: "h-20 justify-between",
    desktopNav: "hidden items-center gap-1 md:flex",
    desktopVersion: "hidden md:flex",
    github: "hidden xl:inline-flex",
    mobilePanel: "w-56 bg-surface-strong/95",
    brandSubtitle: "WORLD SYSTEMS",
  },
  voxel: {
    header: "sticky top-0 z-50 border-b border-line bg-canvas/75 backdrop-blur-2xl",
    inner: "h-[76px] gap-5",
    desktopNav: "ml-auto hidden items-center gap-1 xl:flex",
    desktopVersion: "ml-auto hidden md:flex xl:ml-4",
    github: "hidden sm:inline-flex",
    mobilePanel: "w-64 bg-surface-strong/95",
    brandSubtitle: "一个世界，从设定走向运行",
  },
} as const;

export function BrandLockup({ visual, href }: { visual: Visual; href: string }) {
  const styles = chromeStyles[visual];
  return (
    <a
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan"
      aria-label={`返回 ${siteConfig.name} 首页`}
    >
      <span className={visual === "classic" ? "brand-mark brand-mark--orbit" : "brand-mark brand-mark--voxel"} aria-hidden="true"><i /></span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.78rem] font-semibold tracking-[0.2em] text-fg">{siteConfig.displayName}</strong>
        <small className={cn("mt-0.5 hidden font-mono text-[0.54rem] tracking-[0.14em] text-fg-dim sm:block", visual === "classic" && "tracking-[0.18em]")}>{styles.brandSubtitle}</small>
      </span>
    </a>
  );
}

function NavigationLinks({ items }: { items: readonly NavItem[] }) {
  return items.map((item) => (
    <a
      className="flex min-h-10 items-center rounded-[0.72rem] px-3.5 py-2 text-[0.72rem] tracking-[0.08em] text-fg-dim outline-none transition-[transform,background-color,color] duration-200 hover:bg-white/[0.055] hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-cyan active:translate-y-px active:bg-accent-cyan/[0.08]"
      href={item.href}
      key={item.href}
    >
      {item.label}
    </a>
  ));
}

export function SiteHeader({
  visual,
  activeVersion,
  brandHref,
  navItems,
}: {
  visual: Visual;
  activeVersion: SiteVersion;
  brandHref: string;
  navItems: readonly NavItem[];
}) {
  const styles = chromeStyles[visual];
  return (
    <header className={styles.header}>
      <PageContainer width="wide" className={cn("flex items-center", styles.inner)}>
        <BrandLockup visual={visual} href={brandHref} />
        <nav className={styles.desktopNav} aria-label={`${siteConfig.name} 主导航`}>
          <NavigationLinks items={navItems} />
        </nav>
        <VersionSwitcher active={activeVersion} className={styles.desktopVersion} />
        <ActionLink
          className={styles.github}
          href={siteConfig.links.github}
          target="_blank"
          variant="quiet"
          size="sm"
          shape={visual === "voxel" ? "pill" : "rounded"}
          endIcon="↗"
        >
          GitHub
        </ActionLink>
        <details className="group relative ml-auto md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-[0.8rem] border border-white/10 bg-white/[0.035] text-fg-muted outline-none transition-[transform,border-color,background-color,color] duration-200 marker:hidden hover:border-accent-cyan/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-cyan active:scale-95 group-open:border-accent-cyan/40 group-open:bg-accent-cyan/[0.08] group-open:text-accent-cyan" aria-label="打开导航菜单">•••</summary>
          <nav className={cn("absolute right-0 top-12 grid gap-1 rounded-2xl border border-line p-2 shadow-panel backdrop-blur-2xl", styles.mobilePanel)} aria-label={`${siteConfig.name} 移动端导航`}>
            <VersionSwitcher active={activeVersion} className="mb-2 flex" />
            <NavigationLinks items={navItems} />
          </nav>
        </details>
      </PageContainer>
    </header>
  );
}

export function SiteFooter({
  visual,
  description,
  statusLabel,
  status,
}: {
  visual: Visual;
  description: ReactNode;
  statusLabel?: string;
  status: ReactNode;
}) {
  return (
    <footer className="relative z-10 border-t border-line">
      <PageContainer className="flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <strong className="text-sm tracking-[0.18em] text-fg">{siteConfig.displayName}</strong>
          <p className="mt-2 max-w-md text-sm leading-6 text-fg-dim">{description}</p>
        </div>
        <div className="text-left sm:text-right">
          {statusLabel ? <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg-dim">{statusLabel}</p> : null}
          <div className={cn("mt-2 text-sm text-fg-muted", visual === "classic" && "flex items-center gap-2 sm:justify-end")}>{visual === "classic" ? <span className="status-dot" aria-hidden="true" /> : null}{status}</div>
        </div>
      </PageContainer>
    </footer>
  );
}
