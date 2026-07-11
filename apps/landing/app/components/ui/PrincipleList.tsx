import { cn } from "@/app/lib/cn";

export type Principle = readonly [string, string];

export type PrincipleListProps = {
  principles: readonly Principle[];
  appearance?: "classic" | "voxel";
};

export function PrincipleList({ principles, appearance = "classic" }: PrincipleListProps) {
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
          <i
            className="hidden not-italic text-fg-dim transition-[color,transform] duration-200 group-hover:text-accent-cyan md:block"
            aria-hidden="true"
          >
            ↗
          </i>
        </article>
      ))}
    </div>
  );
}
