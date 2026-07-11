import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

export type PageContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section";
  width?: "content" | "wide";
};

const containerWidths = {
  content: "max-w-[1344px]",
  wide: "max-w-[1440px]",
} as const;

export function PageContainer({
  as: Component = "div",
  width = "content",
  className,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", containerWidths[width], className)}
      {...props}
    />
  );
}
