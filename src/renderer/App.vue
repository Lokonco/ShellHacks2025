<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import pyodide from './pyodide-loader'

import PythonInputContext from "./components/python/PythonInputContext.vue";
import SketchPreview from "./components/SketchPreview.vue";
import PythonConsoleOutput from './components/python/console/PythonConsoleOutput.vue'
import SettingsWindow from "./components/settings/SettingsWindow.vue";

pyodide.init()

// Reactive points state updated by events from Python (send_points)
const dynamicPoints = ref<Array<{x:number,y:number,z:number}>>([])

function onSketchPoints(ev: Event) {
  const custom = ev as CustomEvent
  dynamicPoints.value = Array.isArray(custom.detail) ? custom.detail : []
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
})

onBeforeUnmount(() => {
  window.removeEventListener('sketch:points', onSketchPoints as any)
})

// Optionally, notify main for debugging (safe if electronAPI exists)
try { (window as any).electronAPI?.sendMessage?.('App mounted'); } catch {}
</script>

<template>
  <!-- Python code editor -->
  <PythonInputContext
      :prevent-automatic-code-update="preventDuringLive"
      style="height: 400px; width: 100%;"
  />

  <!-- Console output below the editor -->
  <PythonConsoleOutput />

  <!-- Single empty sketch render that updates via events -->
  <SketchPreview
    :points="dynamicPoints"
    :filled="false"
    :canvas_dimensions="{ width: 640, height: 400 }"
  />
  <SettingsWindow @settings-change="onSettingsChange" />
</template>

<style scoped>
</style>
