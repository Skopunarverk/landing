type VersionSwitcherProps = {
  active: "v1" | "v2";
  className?: string;
};

const versions = [
  { id: "v1", label: "原版", href: "/" },
  { id: "v2", label: "体素叙事版", href: "/v2" },
] as const;

export function VersionSwitcher({ active, className = "" }: VersionSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="页面版本"
      className={`items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 ${className}`}
    >
      {versions.map((version) => {
        const current = version.id === active;
        return (
          <a
            key={version.id}
            href={version.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-9 items-center justify-center rounded-full px-3 text-[0.65rem] font-medium tracking-[0.08em] outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060812] active:translate-y-px ${
              current
                ? "bg-white text-[#080a16] shadow-[0_6px_22px_rgba(255,255,255,0.12)]"
                : "text-white/55 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {version.label}
          </a>
        );
      })}
    </div>
  );
}
