import { brand } from "@skopunarverk/brand";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <a className="sk-brand" href={href} aria-label={`返回 ${brand.name} 首页`}>
      <span className="sk-brand__mark" aria-hidden="true" />
      <span className="sk-brand__copy">
        <span className="sk-brand__name">{brand.displayName}</span>
        <span className="sk-brand__tagline">WORLD SYSTEMS</span>
      </span>
    </a>
  );
}
