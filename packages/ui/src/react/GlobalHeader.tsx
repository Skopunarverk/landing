import { products, type ProductId } from "@skopunarverk/brand";
import { BrandMark } from "./BrandMark";

export function GlobalHeader({ active }: { active: ProductId }) {
  return (
    <header className="sk-header">
      <div className="sk-container sk-header__inner">
        <BrandMark />
        <nav className="sk-product-nav" aria-label="Sköpunarverk 产品导航">
          {products.filter((product) => product.id !== "runtime").map((product) => (
            <a key={product.id} href={product.href} aria-current={product.id === active ? "page" : undefined}>
              {product.shortName}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
