type AnimationSchedulerOptions = {
  render: (time: number, reducedMotion: boolean) => void;
  resize?: () => void;
  observe?: Element;
  viewportMargin?: string;
};

export function createAnimationScheduler({
  render,
  resize,
  observe,
  viewportMargin = "120px",
}: AnimationSchedulerOptions) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionPreference.matches;
  let documentVisible = !document.hidden;
  let inViewport = true;
  let frame = 0;

  const draw = (time = 0) => render(time, reducedMotion);
  const tick = (time: number) => {
    draw(time);
    frame = window.requestAnimationFrame(tick);
  };
  const sync = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    if (!reducedMotion && documentVisible && inViewport) {
      frame = window.requestAnimationFrame(tick);
    } else {
      draw();
    }
  };
  const onResize = () => {
    resize?.();
    draw(performance.now());
  };
  const onVisibility = () => {
    documentVisible = !document.hidden;
    sync();
  };
  const onMotionPreference = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    sync();
  };
  const viewportObserver = observe && "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting;
        sync();
      }, { rootMargin: viewportMargin })
    : null;

  resize?.();
  sync();
  if (observe) viewportObserver?.observe(observe);
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
}
