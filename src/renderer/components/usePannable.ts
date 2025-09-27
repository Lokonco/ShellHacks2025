// usePannable.ts
// Vue composable for tracking mouse drag (panning) on an element
import { ref, onMounted, onBeforeUnmount } from 'vue';

import type { Ref } from 'vue';
export function usePannable(targetRef: Ref<HTMLElement | null>) {
  const isPanning = ref(false);
  const last = ref({ x: 0, y: 0 });
  const panOffset = ref({ x: 0, y: 0 });

  function onMouseDown(e: MouseEvent) {
    isPanning.value = true;
    last.value = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isPanning.value) return;
    const dx = e.clientX - last.value.x;
    const dy = e.clientY - last.value.y;
    panOffset.value.x += dx;
    panOffset.value.y += dy;
    last.value = { x: e.clientX, y: e.clientY };
    // For now, just log the pan offset
    console.log('Pan offset:', panOffset.value);
  }

  function onMouseUp() {
    isPanning.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  onMounted(() => {
    if (targetRef.value) {
      targetRef.value.addEventListener('mousedown', onMouseDown);
    }
  });
  onBeforeUnmount(() => {
    if (targetRef.value) {
      targetRef.value.removeEventListener('mousedown', onMouseDown);
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  });

  return {
    isPanning,
    panOffset,
  };
}
