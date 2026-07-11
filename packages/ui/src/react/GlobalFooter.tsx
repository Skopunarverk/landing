import { brand } from "@skopunarverk/brand";

export function GlobalFooter() {
  return (
    <footer className="sk-footer">
      <div className="sk-container sk-footer__inner">
        <span>{brand.name}</span>
        <a className="sk-link" href={brand.repository}>GitHub</a>
      </div>
    </footer>
  );
}
