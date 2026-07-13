import { siteConfig, type SiteVersion } from "@/app/lib/site";
import { cn } from "@/app/lib/cn";
import { ActionLink } from "../ui/ActionLink";
import { PageContainer } from "../ui/PageContainer";
import { BrandLockup } from "./BrandLockup";
import { chromeStyles } from "./chromeStyles";
import { NavigationLinks } from "./NavigationLinks";
import type { NavItem, SiteVisual } from "./types";
import { VersionSwitcher } from "./VersionSwitcher";

export type SiteHeaderProps = {
  visual: SiteVisual;
  activeVersion: SiteVersion;
  brandHref: string;
  mainHref: string;
  navItems: readonly NavItem[];
};

export function SiteHeader({ visual, activeVersion, brandHref, mainHref, navItems }: SiteHeaderProps) {
  const styles = chromeStyles[visual];
  return (
    <>
      <a className="site-skip-link" href={mainHref}>跳到正文</a>
      <header className={styles.header}>
        <PageContainer width="wide" className={cn("flex items-center", styles.inner)}>
          <BrandLockup href={brandHref} />
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
            <summary
              className="grid size-11 cursor-pointer list-none place-items-center rounded-[0.8rem] border border-white/10 bg-white/[0.035] text-fg-muted outline-none transition-[transform,border-color,background-color,color] duration-200 marker:hidden hover:border-accent-cyan/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-cyan active:scale-95 group-open:border-accent-cyan/40 group-open:bg-accent-cyan/[0.08] group-open:text-accent-cyan"
              aria-label="打开导航菜单"
            >
              •••
            </summary>
            <nav
              className={cn(
                "absolute right-0 top-12 grid gap-1 rounded-2xl border border-line p-2 shadow-panel backdrop-blur-2xl",
                styles.mobilePanel,
              )}
              aria-label={`${siteConfig.name} 移动端导航`}
            >
              <VersionSwitcher active={activeVersion} className="mb-2 flex" />
              <NavigationLinks items={navItems} />
            </nav>
          </details>
        </PageContainer>
      </header>
    </>
  );
}
