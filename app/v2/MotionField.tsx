"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
  depth: number;
};

function seeded(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function MotionField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    let stars: Star[] = [];
    let frame = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let visible = !document.hidden;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(180, Math.max(80, Math.round((window.innerWidth * window.innerHeight) / 9800)));
      stars = Array.from({ length: count }, (_, index) => ({
        x: seeded(index * 7 + 1) * window.innerWidth,
        y: seeded(index * 11 + 2) * window.innerHeight,
        radius: seeded(index * 13 + 3) * 1.1 + 0.25,
        alpha: seeded(index * 17 + 4) * 0.5 + 0.16,
        phase: seeded(index * 19 + 5) * Math.PI * 2,
        speed: seeded(index * 23 + 6) * 0.001 + 0.00035,
        depth: ((index % 4) + 1) / 4,
      }));
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const shiftX = (pointerX - 0.5) * 10;
      const shiftY = (pointerY - 0.5) * 10;

      stars.forEach((star) => {
        const twinkle = reducedMotion ? 1 : 0.78 + Math.sin(time * star.speed + star.phase) * 0.22;
        context.beginPath();
        context.fillStyle = `rgba(${star.depth > 0.7 ? "194,235,255" : "222,225,255"},${star.alpha * twinkle})`;
        context.arc(star.x + shiftX * star.depth, star.y + shiftY * star.depth, star.radius * twinkle, 0, Math.PI * 2);
        context.fill();
      });

    };

    const tick = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(tick);
    };

    const syncAnimation = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (!reducedMotion && visible) {
        frame = window.requestAnimationFrame(tick);
      } else {
        draw();
      }
    };

    const onPointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };
    const onResize = () => {
      resize();
      draw(performance.now());
    };
    const onVisibility = () => {
      visible = !document.hidden;
      syncAnimation();
    };
    const onMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncAnimation();
    };

    resize();
    syncAnimation();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    motionPreference.addEventListener("change", onMotionPreference);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      motionPreference.removeEventListener("change", onMotionPreference);
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-v2-reveal]"));
    if (reducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.setAttribute("data-v2-visible", "true"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-v2-visible", "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -42px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden="true" />;
}
