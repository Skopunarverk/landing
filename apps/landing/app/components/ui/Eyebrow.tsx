import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

export type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: "muted" | "accent";
  dot?: boolean;
};

const eyebrowTones = {
  muted: "text-fg-dim",
  accent: "text-accent-cyan",
} as const;

export function Eyebrow({ tone = "muted", dot = false, className, children, ...props }: EyebrowProps) {
  return (
    <p
      data-ui="eyebrow"
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em]",
        eyebrowTones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="status-dot" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}
