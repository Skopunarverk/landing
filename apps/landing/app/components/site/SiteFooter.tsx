import type { ReactNode } from "react";
import { cn } from "@/app/lib/cn";
import { siteConfig } from "@/app/lib/site";
import { PageContainer } from "../ui/PageContainer";
import type { SiteVisual } from "./types";

export type SiteFooterProps = {
  visual: SiteVisual;
  description: ReactNode;
  statusLabel?: string;
  status: ReactNode;
};

export function SiteFooter({ visual, description, statusLabel, status }: SiteFooterProps) {
  return (
    <footer className="relative z-10 border-t border-line">
      <PageContainer className="flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <strong className="text-sm tracking-[0.18em] text-fg">{siteConfig.displayName}</strong>
          <p className="mt-2 max-w-md text-sm leading-6 text-fg-dim">{description}</p>
        </div>
        <div className="text-left sm:text-right">
          {statusLabel ? <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg-dim">{statusLabel}</p> : null}
          <div className={cn("mt-2 text-sm text-fg-muted", visual === "classic" && "flex items-center gap-2 sm:justify-end")}>
            {visual === "classic" ? <span className="status-dot" aria-hidden="true" /> : null}
            {status}
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
