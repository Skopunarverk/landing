import { BrandMark } from "@skopunarverk/ui/react";

export type BrandLockupProps = {
  href: string;
};

export function BrandLockup({ href }: BrandLockupProps) {
  return <BrandMark href={href} />;
}
