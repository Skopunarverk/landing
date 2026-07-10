import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

export type StatusTone = "neutral" | "cyan" | "violet" | "gold" | "pink" | "green";

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
  dot?: boolean;
};

const statusToneClasses: Record<StatusTone, string> = {
  neutral: "text-fg-muted",
  cyan: "text-accent-cyan",
  violet: "text-accent-violet",
  gold: "text-accent-gold",
  pink: "text-accent-magenta",
  green: "text-positive",
};

const statusDotClasses: Record<StatusTone, string> = {
  neutral: "bg-fg-dim shadow-[0_0_8px_var(--color-fg-dim)]",
  cyan: "bg-accent-cyan shadow-[0_0_8px_var(--color-accent-cyan)]",
  violet: "bg-accent-violet shadow-[0_0_8px_var(--color-accent-violet)]",
  gold: "bg-accent-gold shadow-[0_0_8px_var(--color-accent-gold)]",
  pink: "bg-accent-magenta shadow-[0_0_8px_var(--color-accent-magenta)]",
  green: "bg-positive shadow-[0_0_8px_var(--color-positive)]",
};

export function StatusBadge({ tone = "neutral", dot = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-max items-center gap-2 rounded-full border border-line bg-white/[0.03] px-2.5 py-1.5 font-mono text-[0.55rem] tracking-[0.08em]",
        statusToneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot ? <i className={cn("size-1.5 rounded-full", statusDotClasses[tone])} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
