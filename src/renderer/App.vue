<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { CircularLinkedList } from './utils/CircularLinkedList'

import pyodide from './pyodide-loader'

import PythonInputContext from "./components/python/PythonInputContext.vue";
import SketchPreview from "./components/SketchPreview.vue";
import PythonConsoleOutput from './components/python/console/PythonConsoleOutput.vue'
import SettingsWindow from "./components/settings/SettingsWindow.vue";
import ShapeExporter from "./components/ShapeExporter.vue";

pyodide.init()

// Key to force remount SketchPreview components
const sketchKey = ref(0);
function reloadSketchPreviews() {
  sketchKey.value++;
}

// Reactive points state updated by events from Python (send_points)
const dynamicPoints = ref<Array<{x:number,y:number,z:number}>>([])
// Reactive shapes updated by events from Python (send_points_multi)
const dynamicMultiShapes = ref<Array<any>>([])

// Demo test data for ShapeExporter.pointArrays
// Format: Array of polygons, each polygon is an array of {x, y} points (closed rings)
const demoPointArrays = ref<Array<Array<{ x: number, y: number }>>>([
  // Outer boundary (big square)
  [
    { x: -20, y: -20 }, { x: 20, y: -20 },
    { x: 20, y: 20 }, { x: -20, y: 20 },
    { x: -20, y: -20 }
  ],
  // Hole 1 (top-left)
  [
    {x: -12, y: 8}, {x: -8, y: 8},
    {x: -8, y: 12}, {x: -12, y: 12},
    {x: -12, y: 8}
  ],
  // Hole 2 (top-right)
  [
    {x: 8, y: 8}, {x: 12, y: 8},
    {x: 12, y: 12}, {x: 8, y: 12},
    {x: 8, y: 8}
  ],
  // Hole 3 (bottom-right)
  [
    {x: 8, y: -12}, {x: 12, y: -12},
    {x: 12, y: -8}, {x: 8, y: -8},
    {x: 8, y: -12}
  ],
  // Hole 4 (bottom-left)
  [
    {x: -12, y: -12}, {x: -8, y: -12},
    {x: -8, y: -8}, {x: -12, y: -8},
    {x: -12, y: -12}
  ]
])

function onSketchPoints(ev: Event) {
  const custom = ev as CustomEvent
  dynamicPoints.value = Array.isArray(custom.detail) ? custom.detail : []
}

function onSketchMultiPoints(ev: Event) {
  const custom = ev as CustomEvent
  const all = Array.isArray(custom.detail) ? custom.detail : []
  const colors = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 128, b: 255 },
    { r: 0, g: 170, b: 0 },
    { r: 255, g: 128, b: 0 },
    { r: 128, g: 0, b: 255 },
  ]
  dynamicMultiShapes.value = all.map((arr: any[], idx: number) => ({
    points: (Array.isArray(arr) ? arr : []).map((p: any) => ({
      x: Number(p?.x ?? p?.get?.('x') ?? 0),
      y: Number(p?.y ?? p?.get?.('y') ?? 0),
      z: Number(p?.z ?? p?.get?.('z') ?? 0),
    })),
    filled: false,
    color: colors[idx % colors.length],
    position: { x: 0, y: 0 }
  }))
}
// Global-ish settings driving child components
const preventDuringLive = ref(false)

function onSettingsChange(payload: any) {
  if (payload && payload.all && typeof payload.all.shouldAutocompilePython === 'boolean') {
    preventDuringLive.value = !payload.all.shouldAutocompilePython
  }
}

onMounted(() => {
  window.addEventListener('sketch:points', onSketchPoints as any)
  window.addEventListener('sketch:multi_points', onSketchMultiPoints as any)
})

onBeforeUnmount(() => {
  window.removeEventListener('sketch:points', onSketchPoints as any)
  window.removeEventListener('sketch:multi_points', onSketchMultiPoints as any)
})

// Optionally, notify main for debugging (safe if electronAPI exists)
try { (window as any).electronAPI?.sendMessage?.('App mounted'); } catch {}

// --- Linked List Test Case: Triangle and Square ---
// Triangle points
const triangleList = new CircularLinkedList([
  { x: 50, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 }
]);
// Square points
const squareList = new CircularLinkedList([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 }
]);

// Convert to SketchPreview shape objects
const linkedListShapes = [
  {
    points: triangleList.toSketchPreviewFormat(),
    filled: true,
    color: { r: 255, g: 128, b: 0 },
    position: { x: 120, y: 0 }
  },
  {
    points: squareList.toSketchPreviewFormat(),
    filled: false,
    color: { r: 0, g: 128, b: 255 },
    position: { x: 0, y: 0 }
  }
];
</script>

<template>
    <ShapeExporter :point-arrays="dynamicMultiShapes"></ShapeExporter>
  <!-- Python code editor -->
  <PythonInputContext
      :prevent-automatic-code-update="preventDuringLive"
      style="height: 200px; width: 100%;"
  />

  <!-- Console output below the editor -->
  <PythonConsoleOutput />

  <!-- Single sketch render that updates via events; supports multiple outlines via send_points_multi -->
  <SketchPreview
    :shapes="dynamicMultiShapes"
    :canvas_dimensions="{ width: 640, height: 400 }"
  />
  <SettingsWindow @settings-change="onSettingsChange" />

  <!-- Test case of using a live preview with hardcoded points for shapes -->
  <!-- Developer reload button for SketchPreview components -->
  <SketchPreviewReload @reload="reloadSketchPreviews" />
  <!-- Render a canvas with two shapes from linked lists (triangle and square) -->
  <SketchPreview
    :key="'linkedlist-test-' + sketchKey"
    :shapes="linkedListShapes"
    :canvas_dimensions="{ width: 300, height: 150 }"
  />

<!--  &lt;!&ndash; Render a canvas with a triangle and a square &ndash;&gt;-->
<!--  <SketchPreview-->
<!--    :key="'triangle-circle-' + sketchKey"-->
<!--    :shapes="[-->
<!--      {-->
<!--        points: (new CircularLinkedList([-->
<!--          { x: 50, y: 0 },-->
<!--          { x: 100, y: 100 },-->
<!--          { x: 0, y: 100 }-->
<!--        ])).toSketchPreviewFormat(),-->
<!--        filled: true,-->
<!--        color: { r: 0, g: 170, b: 0 },-->
<!--        position: { x: 100, y: 0 }-->
<!--      },-->
<!--      {-->
<!--        points: (new CircularLinkedList([-->
<!--          { x: 50, y: 0 },-->
<!--          { x: 100, y: 25 },-->
<!--          { x: 100, y: 75 },-->
<!--          { x: 50, y: 100 },-->
<!--          { x: 0, y: 75 },-->
<!--          { x: 0, y: 25 }-->
<!--        ])).toSketchPreviewFormat(),-->
<!--        filled: false,-->
<!--        color: { r: 0, g: 0, b: 255 },-->
<!--        position: { x: 0, y: 0 }-->
<!--      }-->
<!--    ]"-->
<!--    :canvas_dimensions="{ width: 180, height: 100 }"-->
<!--  />-->
<!--  &lt;!&ndash; Render a canvas with a hexagon and a triangle &ndash;&gt;-->
<!--  <SketchPreview-->
<!--    :key="'hexagon-triangle-' + sketchKey"-->
<!--    :shapes="[-->
<!--      {-->
<!--        points: (new CircularLinkedList([-->
<!--          { x: 50, y: 0 },-->
<!--          { x: 100, y: 25 },-->
<!--          { x: 100, y: 75 },-->
<!--          { x: 50, y: 100 },-->
<!--          { x: 0, y: 75 },-->
<!--          { x: 0, y: 25 }-->
<!--        ])).toSketchPreviewFormat(),-->
<!--        filled: false,-->
<!--        color: { r: 255, g: 0, b: 255 },-->
<!--        position: { x: 30, y: 60 }-->
<!--      },-->
<!--      {-->
<!--        points: (new CircularLinkedList([-->
<!--          { x: 50, y: 0 },-->
<!--          { x: 100, y: 100 },-->
<!--          { x: 0, y: 100 }-->
<!--        ])).toSketchPreviewFormat(),-->
<!--        filled: true,-->
<!--        color: { r: 0, g: 170, b: 0 },-->
<!--        position: { x: 100, y: 0 }-->
<!--      }-->
<!--    ]"-->
<!--    :canvas_dimensions="{ width: 480, height: 400 }"-->
<!--  />-->
</template>

<style scoped>
</style>
