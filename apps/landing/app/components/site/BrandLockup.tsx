import { siteConfig } from "@/app/lib/site";
import { cn } from "@/app/lib/cn";
import { chromeStyles } from "./chromeStyles";
import type { SiteVisual } from "./types";

export type BrandLockupProps = {
  visual: SiteVisual;
  href: string;
};

export function BrandLockup({ visual, href }: BrandLockupProps) {
  const styles = chromeStyles[visual];
  return (
    <a
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan"
      aria-label={`返回 ${siteConfig.name} 首页`}
    >
      <span className={visual === "classic" ? "brand-mark brand-mark--orbit" : "brand-mark brand-mark--voxel"} aria-hidden="true">
        <i />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.78rem] font-semibold tracking-[0.2em] text-fg">{siteConfig.displayName}</strong>
        <small
          className={cn(
            "mt-0.5 hidden font-mono text-[0.54rem] tracking-[0.14em] text-fg-dim sm:block",
            visual === "classic" && "tracking-[0.18em]",
          )}
        >
          {styles.brandSubtitle}
        </small>
      </span>
    </a>
  );
}
