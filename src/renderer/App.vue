<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { CircularLinkedList } from './utils/CircularLinkedList'

import pyodide from './pyodide-loader'

import PythonInputContext from "./components/python/PythonInputContext.vue";
import SketchPreview from "./components/SketchPreview.vue";
import SketchPreviewReload from "./components/SketchPreviewReload.vue";
import PythonConsoleOutput from './components/python/console/PythonConsoleOutput.vue'
import SettingsWindow from "./components/settings/SettingsWindow.vue";
import ShapeExporter from "./components/ShapeExporter.vue";
import ToggleRenderView from './components/ToggleRenderView.vue';

pyodide.init()

const currentView = ref<'exporter' | 'preview'>('preview')

function toggleView() {
  currentView.value = currentView.value === 'preview' ? 'exporter' : 'preview'
}

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
ref<Array<Array<{ x: number, y: number }>>>([
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
]);
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
    filled: true,
    color: { r: 0, g: 128, b: 255 },
    position: { x: 0, y: 0 }
  }
];

// --- Resizable Split Columns ---
const MIN_LEFT = 15; // percent
const MAX_LEFT = 85; // percent
const leftPercent = ref(Number(localStorage.getItem('app.split.leftPercent')) || 33.33);
const gridStyle = computed(() => ({ '--leftCol': leftPercent.value + '%' }));
let resizing = false;

function computePercent(clientX) {
  const grid = document.querySelector('.app-grid');
  if (!grid) return leftPercent.value;
  const rect = grid.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const pct = (x / rect.width) * 100;
  return Math.min(MAX_LEFT, Math.max(MIN_LEFT, pct));
}

function onMouseMove(e) {
  if (!resizing) return;
  leftPercent.value = computePercent(e.clientX);
}
function onTouchMove(e) {
  if (!resizing) return;
  if (e.touches && e.touches[0]) {
    leftPercent.value = computePercent(e.touches[0].clientX);
  }
  // Prevent page scroll during touch drag
  e.preventDefault();
}

function startResize() {
  resizing = true;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', stopResize);
}
function startResizeTouch() {
  resizing = true;
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', stopResize);
}
function stopResize() {
  if (!resizing) return;
  resizing = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', stopResize);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', stopResize);
  try { localStorage.setItem('app.split.leftPercent', String(leftPercent.value)); } catch {}
}

</script>

<!-- TODO: Refactor the download button
so it's independent from ShapeExporter, and make it usable on both components, maybe move it to settings? -->
<template>
  <div class="app-grid" :style="gridStyle">

    <!-- Left Column: Editor + Console + Settings -->
    <div class="left-column">
      <div class="card">
        <h3>Python Editor</h3>
        <PythonInputContext
          :prevent-automatic-code-update="preventDuringLive"
          style="height: 200px; width: 100%;"
        />
      </div>

      <div class="card">
        <h3>Console Output</h3>
        <PythonConsoleOutput />
      </div>

      <div>
        <h3>Settings</h3>
        <SettingsWindow @settings-change="onSettingsChange" />
      </div>
    </div>

    <div class="col-resizer"
         @mousedown="startResize"
         @touchstart.prevent="startResizeTouch"
         :title="'Drag to resize columns'">
      <div class="handle"></div>
    </div>

    <!-- Right Column: Shape Exporter + Sketch Previews -->
    <div class="right-column">
      <div class="card">
        <h3>Switch Components</h3>
        <button @click="toggleView">
          {{ currentView === 'preview' ? 'Show Exporter' : 'Show Preview' }}
        </button>

        <div v-if="currentView === 'preview'" class="sketch-window">
          <SketchPreview
            :key="currentView"
            :shapes="dynamicMultiShapes"
          />
        </div>

        <ShapeExporter
          v-else
          :point-arrays="dynamicMultiShapes"
        />
      </div>
    </div>

  </div>

</template>

<style scoped>
.app-grid {
  --leftCol: 33.33%;
  display: grid;
  grid-template-columns: var(--leftCol) 8px calc(100% - var(--leftCol) - 8px);
  gap: 8px;
  padding: 0;
  max-width: 100vw;
  overflow-x: hidden;
  align-items: stretch;
}

.col-resizer { cursor: col-resize; position: relative; background: transparent; }
.col-resizer .handle { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; transition: background 0.15s; }
.col-resizer:hover .handle, .col-resizer:active .handle { background: rgba(0,0,0,0.2); }

/* Make each column a vertical flex container */
.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Card styling to visually separate components */
.card {
  background: #f9f9f9;
  padding: 6px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1rem;
  color: #333;
}

/* Ensure right column content fits viewport width and prevent horizontal scroll */
.right-column { min-width: 0; }
.card { overflow: hidden; }

/* Stable sketch window area */
.sketch-window { width: 100%; height: 650px; overflow: hidden; margin: 0 -6px; }
.sketch-window > * { width: 100%; height: 100%; display: block; }

/* Make canvases fill the sketch window without distortion (letterboxed) */
.sketch-window :deep(canvas) { max-width: 100%; width: 100%; height: 100%; display: block; object-fit: contain; }

/* Square toggle button for switching Settings <-> GenAI Demo */
.square-toggle {
  width: 32px;
  height: 32px;
  min-width: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #333;
  background: #2b2b2b;
  color: #eee;
  border-radius: 6px; /* slight rounding but square shape */
  cursor: pointer;
}
.square-toggle:hover { background: #333; }
.square-toggle:active { transform: translateY(1px); }
</style>

