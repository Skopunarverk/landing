import type { CSSProperties, ReactNode } from "react";

const colors = { neutral: "var(--sk-color-muted)", cyan: "var(--sk-color-cyan)", violet: "var(--sk-color-violet)", gold: "var(--sk-color-gold)", positive: "var(--sk-color-positive)" } as const;

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof colors; children: ReactNode }) {
  return <span className="sk-badge" style={{ "--sk-badge-color": colors[tone] } as CSSProperties}>{children}</span>;
}
