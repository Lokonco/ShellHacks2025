// usePannable.ts
// -------------------
// Vue composable for tracking mouse drag (panning) on an element.
// Provides a reactive panOffset and isPanning state.

import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';

/**
 * usePannable composable
 * ----------------------
 * Attaches mouse event listeners to a target element to track panning (dragging).
 * Exposes a reactive panOffset (total pan distance) and isPanning state.
 *
 * @param targetRef - ref to the element to attach mouse events
 *
 * Usage:
 *   const { panOffset, isPanning } = usePannable(containerRef)
 *
 * Notes:
 * - panOffset is updated as the user drags the mouse.
 * - isPanning is true while the mouse is held down and moving.
 * - Listeners are cleaned up on component unmount.
 * - This composable does not handle touch events (mouse only).
 */
export function usePannable(targetRef: Ref<HTMLElement | null>) {
  // isPanning: true while mouse is held down and moving
  const isPanning = ref(false);
  // last: last mouse position {x, y}
  const last = ref({ x: 0, y: 0 });
  // panOffset: total pan distance {x, y}
  const panOffset = ref({ x: 0, y: 0 });

  /**
   * onMouseDown
   * Starts panning and records the initial mouse position.
   */
  function onMouseDown(e: MouseEvent) {
    isPanning.value = true;
    last.value = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /**
   * onMouseMove
   * Updates panOffset as the mouse moves.
   */
  function onMouseMove(e: MouseEvent) {
    if (!isPanning.value) return;
    const dx = e.clientX - last.value.x;
    const dy = e.clientY - last.value.y;
    panOffset.value.x += dx;
    panOffset.value.y += dy;
    last.value = { x: e.clientX, y: e.clientY };
    // For debugging: log the pan offset
    // console.log('Pan offset:', panOffset.value);
  }

  /**
   * onMouseUp
   * Ends panning and removes event listeners.
   */
  function onMouseUp() {
    isPanning.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  // Attach mousedown event on mount
  onMounted(() => {
    if (targetRef.value) {
      targetRef.value.addEventListener('mousedown', onMouseDown);
    }
  });

  // Remove all listeners on unmount
  onBeforeUnmount(() => {
    if (targetRef.value) {
      targetRef.value.removeEventListener('mousedown', onMouseDown);
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  });

  // Expose isPanning and panOffset (both reactive)
  return {
    isPanning,
    panOffset,
  };
}
