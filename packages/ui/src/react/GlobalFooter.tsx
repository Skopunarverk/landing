import { brand } from "@skopunarverk/brand";

export function GlobalFooter() {
  return (
    <footer className="sk-footer">
      <div className="sk-container sk-footer__inner">
        <div className="sk-footer__identity">
          <strong>{brand.displayName}</strong>
          <span>{brand.tagline}</span>
        </div>
        <div className="sk-footer__meta">
          <span>WORLD SYSTEMS · EVOLVING</span>
          <a className="sk-link" href={brand.repository}>GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </footer>
  );
}
