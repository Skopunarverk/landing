"use client";

import { useEffect } from "react";

export function RevealManager() {
  useEffect(() => {
    const root = document.documentElement;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-v2-reveal]"));
    let observer: IntersectionObserver | null = null;

    const sync = () => {
      observer?.disconnect();
      root.removeAttribute("data-v2-reveal-ready");
      if (motionPreference.matches || !("IntersectionObserver" in window)) {
        items.forEach((item) => item.setAttribute("data-v2-visible", "true"));
        return;
      }

      root.setAttribute("data-v2-reveal-ready", "true");
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.setAttribute("data-v2-visible", "true");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -42px" },
      );
      items.forEach((item) => observer?.observe(item));
    };

    sync();
    motionPreference.addEventListener("change", sync);
    return () => {
      observer?.disconnect();
      root.removeAttribute("data-v2-reveal-ready");
      motionPreference.removeEventListener("change", sync);
    };
  }, []);

  return null;
}
