import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section";
  width?: "content" | "wide";
};

const containerWidths = {
  content: "max-w-[1344px]",
  wide: "max-w-[1440px]",
} as const;

export function PageContainer({ as: Component = "div", width = "content", className, ...props }: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", containerWidths[width], className)}
      {...props}
    />
  );
}

type ActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
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
        <span
          aria-hidden="true"
          className={cn("transition-transform duration-200", iconMotions[iconMotion])}
        >
          {endIcon}
        </span>
      ) : null}
    </a>
  );
}

type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
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

type StatusTone = "neutral" | "cyan" | "violet" | "gold" | "pink" | "green";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
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

type Metric = { value: string; label: string };

export function MetricStrip({ metrics, className }: { metrics: readonly Metric[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-3 border-t border-line", className)}>
      {metrics.map((metric) => (
        <div
          className="border-line px-4 pt-4 first:pl-0 last:border-r-0 last:pr-0 [&:not(:last-child)]:border-r sm:px-6"
          key={metric.label}
        >
          <dt className="font-mono text-base text-fg">{metric.value}</dt>
          <dd className="mt-1.5 text-[0.65rem] tracking-[0.1em] text-fg-dim">{metric.label}</dd>
        </div>
      ))}
    </dl>
  );
}

type SectionHeadingProps = {
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
        <Eyebrow tone={appearance === "voxel" ? "accent" : "muted"} className={cn(align === "center" && "justify-center")}>{eyebrow}</Eyebrow>
        <h2 className={cn("mt-5 text-fg", headingTitleStyles[appearance])}>{title}</h2>
      </div>
      <p className={cn("text-[0.94rem] leading-[1.9] text-fg-muted", align === "center" && "mx-auto mt-6 max-w-[45rem]")}>{description}</p>
    </div>
  );
}

type Principle = readonly [string, string];

export function PrincipleList({ principles, appearance = "classic" }: { principles: readonly Principle[]; appearance?: "classic" | "voxel" }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {principles.map(([title, description], index) => (
        <article
          className={cn(
            "group grid items-center gap-5 px-1 py-7 transition-[padding,background-color] duration-300 hover:px-3 hover:bg-white/[0.025] md:grid-cols-[3rem_minmax(13rem,.72fr)_1.3fr_2rem]",
            appearance === "classic" ? "active:bg-accent-violet/[0.05]" : "active:bg-accent-cyan/[0.04]",
          )}
          key={title}
        >
          <span className="font-mono text-[0.6rem] text-accent-violet">0{index + 1}</span>
          <h3 className="text-base text-fg">{title}</h3>
          <p className="col-start-2 col-end-5 text-[0.84rem] leading-7 text-fg-dim md:col-auto">{description}</p>
          <i className="hidden not-italic text-fg-dim transition-[color,transform] duration-200 group-hover:text-accent-cyan md:block" aria-hidden="true">↗</i>
        </article>
      ))}
    </div>
  );
}
