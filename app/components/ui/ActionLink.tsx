import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/app/lib/cn";

export type ActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary" | "quiet";
  size?: "sm" | "md";
  shape?: "rounded" | "pill";
  endIcon?: ReactNode;
  iconMotion?: "diagonal" | "down" | "none";
};

const actionVariants = {
  primary:
    "border-transparent bg-[linear-gradient(110deg,#f8fbff,#a9efff_42%,#a79bff_80%,#ff9ed9)] text-[#07101a] shadow-[0_16px_44px_rgba(122,231,255,.12)] hover:shadow-[0_20px_55px_rgba(122,231,255,.22),inset_0_0_0_1px_rgba(255,255,255,.42)]",
  secondary:
    "border-line bg-surface/45 text-fg hover:border-accent-cyan/40 hover:bg-accent-cyan/[0.07]",
  quiet:
    "border-white/12 bg-white/[0.035] text-fg-muted hover:border-accent-cyan/40 hover:bg-accent-cyan/[0.07] hover:text-fg",
} as const;

const actionSizes = {
  sm: "min-h-10 px-4 py-2 text-[0.72rem]",
  md: "min-h-[3.15rem] px-5 py-3 text-[0.78rem]",
} as const;

const actionShapes = {
  rounded: "rounded-[var(--radius-control)]",
  pill: "rounded-full",
} as const;

const iconMotions = {
  diagonal: "group-hover/action:translate-x-0.5 group-hover/action:-translate-y-0.5",
  down: "group-hover/action:translate-y-0.5",
  none: "",
} as const;

export function ActionLink({
  variant = "secondary",
  size = "md",
  shape = "rounded",
  endIcon,
  iconMotion = "diagonal",
  className,
  children,
  target,
  rel,
  ...props
}: ActionLinkProps) {
  return (
    <a
      className={cn(
        "group/action inline-flex items-center justify-center gap-3 border font-semibold tracking-[0.06em] outline-none transition-[transform,border-color,background-color,box-shadow,color] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan active:translate-y-px active:scale-[.985]",
        actionVariants[variant],
        actionSizes[size],
        actionShapes[shape],
        className,
      )}
      target={target}
      rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
      {...props}
    >
      {children}
      {endIcon ? (
        <span aria-hidden="true" className={cn("transition-transform duration-200", iconMotions[iconMotion])}>
          {endIcon}
        </span>
      ) : null}
    </a>
  );
}
