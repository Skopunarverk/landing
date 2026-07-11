import type { ReactNode } from "react";
import type { ProductId } from "@skopunarverk/brand";
import { GlobalFooter } from "./GlobalFooter";
import { GlobalHeader } from "./GlobalHeader";

export function SiteFrame({ active, children }: { active: ProductId; children: ReactNode }) {
  return (
    <div className="sk-shell">
      <a className="sk-skip-link" href="#main-content">跳到正文</a>
      <GlobalHeader active={active} />
      <main id="main-content">{children}</main>
      <GlobalFooter />
    </div>
  );
}
