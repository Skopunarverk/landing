"use client";

import { useEffect, useRef } from "react";
import { createAnimationScheduler } from "../components/motion/animationScheduler";

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

    let stars: Star[] = [];
    let pointerX = 0.5;
    let pointerY = 0.5;

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

    const draw = (time = 0, reducedMotion = false) => {
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

    const onPointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };
    const disposeScheduler = createAnimationScheduler({ render: draw, resize });
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposeScheduler();
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden="true" />;
}
