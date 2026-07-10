"use client";

import { useEffect, useRef } from "react";
import styles from "./v2.module.css";

type Cell = { x: number; y: number; height: number; water: boolean; order: number };

function hash(x: number, y: number, seed = 17) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
  stroke = "rgba(235,244,255,.075)",
) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 0.75;
  context.stroke();
}

export function VoxelWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    const radius = 6;
    const cells: Cell[] = [];
    for (let x = -radius; x <= radius; x += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        const distance = Math.hypot(x, y);
        if (distance > radius - hash(x, y, 3) * 1.45) continue;
        const hillA = Math.max(0, 4.3 - Math.hypot(x + 2.1, y + 0.8) * 0.76);
        const hillB = Math.max(0, 3.5 - Math.hypot(x - 2.7, y - 1.8) * 0.84);
        const valley = Math.max(0, 1.8 - Math.hypot(x - 0.4, y + 2.4) * 0.62);
        let height = Math.max(1, Math.round(1 + hillA + hillB - valley + hash(x, y, 11) * 1.45));
        const water = (x + y > 2 && x > -1 && y > -3 && height < 3) || (x > 2 && y < -1 && height < 4);
        if (water) height = 1;
        cells.push({ x, y, height, water, order: x + y });
      }
    }
    cells.sort((a, b) => a.order - b.order || a.x - b.x);

    let frame = 0;
    let documentVisible = !document.hidden;
    let inViewport = true;
    let width = 720;
    let height = 720;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      const unit = Math.min(width, height) / 36;
      const vertical = unit * 0.56;
      const bob = reducedMotion ? 0 : Math.sin(time * 0.00072) * 4;
      const parallaxX = reducedMotion ? 0 : pointerRef.current.x * 8;
      const parallaxY = reducedMotion ? 0 : pointerRef.current.y * 5;
      const centerX = width * 0.5 + parallaxX;
      const centerY = height * 0.43 + bob + parallaxY;

      const glow = context.createRadialGradient(centerX, centerY + height * 0.08, 8, centerX, centerY, width * 0.4);
      glow.addColorStop(0, "rgba(122,231,255,.22)");
      glow.addColorStop(0.5, "rgba(110,139,255,.07)");
      glow.addColorStop(1, "rgba(110,139,255,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(centerX, centerY, width * 0.38, 0, Math.PI * 2);
      context.fill();

      cells.forEach((cell) => {
        const isoX = centerX + (cell.x - cell.y) * unit;
        const isoBaseY = centerY + (cell.x + cell.y) * unit * 0.5;
        const topY = isoBaseY - cell.height * vertical;
        const underside = Math.max(1, Math.round((radius - Math.hypot(cell.x, cell.y)) * 0.55 + hash(cell.x, cell.y, 23) * 1.5));
        const bottomY = isoBaseY + underside * vertical;

        const top: Array<[number, number]> = [
          [isoX, topY - unit * 0.5],
          [isoX + unit, topY],
          [isoX, topY + unit * 0.5],
          [isoX - unit, topY],
        ];
        const left: Array<[number, number]> = [top[3], top[2], [isoX, bottomY + unit * 0.5], [isoX - unit, bottomY]];
        const right: Array<[number, number]> = [top[1], top[2], [isoX, bottomY + unit * 0.5], [isoX + unit, bottomY]];

        let topColor = "#6ad7a3";
        let leftColor = "#284f5b";
        let rightColor = "#1c3947";
        if (cell.water) {
          topColor = "#70dff5";
          leftColor = "#23489a";
          rightColor = "#182f72";
        } else if (cell.height >= 5) {
          topColor = "#c6d3ff";
          leftColor = "#596aa8";
          rightColor = "#3d4c86";
        } else if (hash(cell.x, cell.y, 31) < 0.34) {
          topColor = "#79aeb8";
          leftColor = "#344f67";
          rightColor = "#273c53";
        }
        polygon(context, left, leftColor);
        polygon(context, right, rightColor);
        polygon(context, top, topColor);
      });

      const beacons = [
        { x: -2, y: -2, level: 7, color: "#7AE7FF" },
        { x: 3, y: 1, level: 5, color: "#FF7BCB" },
        { x: 0, y: 3, level: 4, color: "#FFF0A8" },
      ];
      beacons.forEach((beacon) => {
        const x = centerX + (beacon.x - beacon.y) * unit;
        const y = centerY + (beacon.x + beacon.y) * unit * 0.5 - beacon.level * vertical;
        context.save();
        context.shadowColor = beacon.color;
        context.shadowBlur = 18;
        context.fillStyle = beacon.color;
        context.globalAlpha = 0.85;
        context.fillRect(x - 2, y - unit * 1.7, 4, unit * 1.7);
        context.restore();
      });

    };

    const tick = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(tick);
    };

    const syncAnimation = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (!reducedMotion && documentVisible && inViewport) {
        frame = window.requestAnimationFrame(tick);
      } else {
        draw();
      }
    };

    const onResize = () => {
      resize();
      draw(performance.now());
    };
    const onVisibility = () => {
      documentVisible = !document.hidden;
      syncAnimation();
    };
    const onMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncAnimation();
    };
    const viewportObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          inViewport = entry.isIntersecting;
          syncAnimation();
        }, { rootMargin: "120px" })
      : null;

    resize();
    syncAnimation();
    viewportObserver?.observe(canvas);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    motionPreference.addEventListener("change", onMotionPreference);
    return () => {
      window.cancelAnimationFrame(frame);
      viewportObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motionPreference.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return (
    <div
      className={styles.voxelFrame}
      role="img"
      aria-label="由确定性体素生成的漂浮世界，代表 Genesis 正在演化的共同世界模型"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        };
      }}
      onPointerLeave={() => { pointerRef.current = { x: 0, y: 0 }; }}
    >
      <div className={styles.orbit} aria-hidden="true"><i /></div>
      <div className={`${styles.orbit} ${styles.orbitInner}`} aria-hidden="true"><i /></div>
      <span className={`${styles.crosshair} ${styles.crosshairA}`} aria-hidden="true" />
      <span className={`${styles.crosshair} ${styles.crosshairB}`} aria-hidden="true" />
      <div className={`${styles.frameLabel} ${styles.labelTop}`}><span>WORLD MODEL</span><strong>EVOLVING</strong></div>
      <div className={`${styles.frameLabel} ${styles.labelBottom}`}><span>AUTHORITY</span><strong>SERVER</strong></div>
      <canvas ref={canvasRef} className={styles.voxelCanvas} />
    </div>
  );
}
