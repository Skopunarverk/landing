import type { SiteVisual } from "./types";

export const chromeStyles: Record<SiteVisual, {
  header: string;
  inner: string;
  desktopNav: string;
  desktopVersion: string;
  github: string;
  mobilePanel: string;
}> = {
  classic: {
    header: "relative z-50 border-b border-line bg-canvas/70 backdrop-blur-xl",
    inner: "h-20 justify-between",
    desktopNav: "hidden items-center gap-1 md:flex",
    desktopVersion: "hidden md:flex",
    github: "hidden xl:inline-flex",
    mobilePanel: "w-56 bg-surface-strong/95",
  },
  voxel: {
    header: "sticky top-0 z-50 border-b border-line bg-canvas/75 backdrop-blur-2xl",
    inner: "h-[76px] gap-5",
    desktopNav: "ml-auto hidden items-center gap-1 xl:flex",
    desktopVersion: "ml-auto hidden md:flex xl:ml-4",
    github: "hidden sm:inline-flex",
    mobilePanel: "w-64 bg-surface-strong/95",
  },
};
