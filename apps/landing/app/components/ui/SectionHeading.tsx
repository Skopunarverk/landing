import type { ReactNode } from "react";
import { cn } from "@/app/lib/cn";
import { Eyebrow } from "./Eyebrow";

export type SectionHeadingProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  align?: "split" | "center";
  appearance?: "classic" | "voxel";
  className?: string;
  reveal?: boolean;
};

const headingLayouts = {
  split: "grid items-end gap-8 md:grid-cols-[1.25fr_.75fr] md:gap-16",
  center: "mx-auto max-w-[55rem] text-center",
} as const;

const headingTitleStyles = {
  classic: "font-display text-[clamp(2.6rem,5vw,5.4rem)] font-medium leading-none tracking-[-0.045em]",
  voxel: "text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[1.04] tracking-[-0.058em]",
} as const;

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "split",
  appearance = "classic",
  className,
  reveal = false,
}: SectionHeadingProps) {
  return (
    <div className={cn(headingLayouts[align], className)} data-v2-reveal={reveal ? true : undefined}>
      <div>
        <Eyebrow tone={appearance === "voxel" ? "accent" : "muted"} className={cn(align === "center" && "justify-center")}>
          {eyebrow}
        </Eyebrow>
        <h2 className={cn("mt-5 text-fg", headingTitleStyles[appearance])}>{title}</h2>
      </div>
      <p className={cn("text-[0.94rem] leading-[1.9] text-fg-muted", align === "center" && "mx-auto mt-6 max-w-[45rem]")}>
        {description}
      </p>
    </div>
  );
}
