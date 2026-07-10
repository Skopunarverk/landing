import type { NavItem } from "./types";

export type NavigationLinksProps = {
  items: readonly NavItem[];
};

export function NavigationLinks({ items }: NavigationLinksProps) {
  return items.map((item) => (
    <a
      className="flex min-h-10 items-center rounded-[0.72rem] px-3.5 py-2 text-[0.72rem] tracking-[0.08em] text-fg-dim outline-none transition-[transform,background-color,color] duration-200 hover:bg-white/[0.055] hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-cyan active:translate-y-px active:bg-accent-cyan/[0.08]"
      href={item.href}
      key={item.href}
    >
      {item.label}
    </a>
  ));
}
