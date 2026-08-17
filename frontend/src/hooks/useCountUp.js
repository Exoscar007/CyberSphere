import { useState, useEffect, useRef } from 'react';

/**
 * Hook to smoothly animate numbers from previous to target value
 * Respects prefers-reduced-motion
 */
export default function useCountUp(targetValue = 0, duration = 600) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const prevValueRef = useRef(targetValue);
  const frameRef = useRef(null);

  useEffect(() => {
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(targetValue);
      prevValueRef.current = targetValue;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = Number(targetValue) || 0;
    if (startVal === endVal) return;

    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    frameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, duration]);

  return displayValue;
}
