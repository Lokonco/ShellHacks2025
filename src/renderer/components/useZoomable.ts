// useZoomable.ts
// -------------------
// Vue composable for tracking mouse wheel (zoom) events on an element.
// Provides a reactive zoomLevel and supports user-configurable scroll direction and speed.

import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';

/**
 * useZoomable composable
 * ----------------------
 * Attaches a wheel event to a target element and exposes a reactive zoomLevel.
 *
 * @param targetRef - ref to the element to attach wheel event
 * @param inverted - ref<boolean>, true to invert scroll direction (user setting)
 * @param zooming_speed - ref<number> (1-100), 100 = fastest (0.1), 1 = slowest (0.01, 10% of fastest)
 *
 * Usage:
 *   const { zoomLevel } = useZoomable(containerRef, invertedRef, speedRef)
 *
 * Notes:
 * - The zoomLevel is clamped between 0.2 and 5.
 * - The wheel event is normalized for both mouse and touchpad.
 * - Negative delta (scroll up/pinch out) zooms in, positive delta zooms out.
 * - The event listener is removed on component unmount.
 */
export function useZoomable(
  targetRef: Ref<HTMLElement | null>,
  inverted: Ref<boolean> = ref(false),
  zooming_speed: Ref<number> = ref(50) // Default to 50 for a balanced speed
) {
  // zoomLevel: the current zoom factor (reactive)
  const zoomLevel = ref(1);

  /**
   * onWheel
   * Handles the wheel event to update zoomLevel.
   * - Normalizes delta for mouse/touchpad.
   * - Applies user inversion setting.
   * - Maps zooming_speed (1-100) to a base factor (0.01-0.1).
   * - Clamps zoomLevel to [0.2, 5].
   */
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    // Normalize delta for both mouse and touchpad
    let delta = e.deltaY;
    // Invert if needed (user setting)
    if (inverted.value) delta = -delta;

    // Map zooming_speed (1-100) to a factor: 100 = 0.1 (fastest), 1 = 0.01 (slowest)
    // Linear interpolation: base = 0.01 + (0.09 * (speed - 1) / 99)
    const speed = Math.max(1, Math.min(100, zooming_speed.value));
    const base = 0.01 + (0.09 * (speed - 1) / 99); // 1->0.01, 100->0.1

    // For both mouse and touchpad: negative delta = zoom in, positive = zoom out
    // (Pinch out = negative delta = zoom in, Pinch in = positive delta = zoom out)
    const factor = 1 + (delta < 0 ? base : -base);
    zoomLevel.value = Math.max(0.2, Math.min(5, zoomLevel.value * factor));
  }

  // Attach wheel event on mount
  onMounted(() => {
    if (targetRef.value) {
      targetRef.value.addEventListener('wheel', onWheel, { passive: false });
    }
  });

  // Remove wheel event on unmount
  onBeforeUnmount(() => {
    if (targetRef.value) {
      targetRef.value.removeEventListener('wheel', onWheel);
    }
  });

  // Expose zoomLevel (reactive)
  return {
    zoomLevel,
  };
}
