import { useEffect, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Animates from 0 toward `end` over `durationMs` with ease-out easing. Resets when `end` changes.
 */
export function useCountUp(end: number, durationMs = 1200, enabled = true): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setValue(end);
      return;
    }
    if (durationMs <= 0) {
      setValue(end);
      return;
    }
    if (end === 0) {
      setValue(0);
      return;
    }
    const start = 0;
    const startTime = Date.now();
    const tick = () => {
      const raw = Math.min((Date.now() - startTime) / durationMs, 1);
      const t = easeOutCubic(raw);
      setValue(Math.round(start + (end - start) * t));
      if (raw < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, durationMs, enabled]);
  return value;
}
