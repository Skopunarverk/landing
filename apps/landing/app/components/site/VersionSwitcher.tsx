import { siteConfig, type SiteVersion } from "@/app/lib/site";
import { cn } from "@/app/lib/cn";

export type VersionSwitcherProps = {
  active: SiteVersion;
  className?: string;
};

export function VersionSwitcher({ active, className }: VersionSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="页面版本"
      className={cn("items-center gap-1 rounded-full border border-line bg-white/[0.035] p-1", className)}
    >
      {siteConfig.versions.map((version) => {
        const current = version.id === active;
        return (
          <a
            key={version.id}
            href={version.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center justify-center rounded-full px-3 text-[0.65rem] font-medium tracking-[0.08em] outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan active:translate-y-px",
              current
                ? "bg-fg text-canvas shadow-[0_6px_22px_rgba(255,255,255,0.12)]"
                : "text-fg-dim hover:bg-white/[0.07] hover:text-fg",
            )}
          >
            {version.label}
          </a>
        );
      })}
    </div>
  );
}
