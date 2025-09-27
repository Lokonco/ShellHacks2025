// useZoomable.ts
// Vue composable for tracking mouse wheel (zoom) events on an element
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';

// 'inverted' param controls scroll direction (user setting)
// 'zooming_speed' param (1-100): 100 = fastest (0.1), 1 = slowest (0.01, 10% of fastest)
/**
 * useZoomable composable
 * @param targetRef - ref to the element to attach wheel event
 * @param inverted - ref<boolean>, true to invert scroll direction
 * @param zooming_speed - ref<number> (1-100), 100 = fastest (0.1), 1 = slowest (0.01, 10% of fastest)
 */
export function useZoomable(
  targetRef: Ref<HTMLElement | null>,
  inverted: Ref<boolean> = ref(false),
  zooming_speed: Ref<number> = ref(50)	//Default to 50 for a balanced speed
) {
  const zoomLevel = ref(1);

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

  onMounted(() => {
    if (targetRef.value) {
      targetRef.value.addEventListener('wheel', onWheel, { passive: false });
    }
  });
  onBeforeUnmount(() => {
    if (targetRef.value) {
      targetRef.value.removeEventListener('wheel', onWheel);
    }
  });

  return {
    zoomLevel,
  };
}
