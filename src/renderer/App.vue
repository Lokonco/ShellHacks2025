<script setup lang="ts">
import { ref } from 'vue'
import viteLogo from './assets/vite.svg';
import vueLogo from './assets/vue.svg';
import pyodide from './pyodide-loader'


import HelloWorld from './components/HelloWorld.vue'
import ThreeSpinningCube from "./components/ThreeSpinningCube.vue";
import PythonInputContext from "./components/python/PythonInputContext.vue";
import SettingsWindow from "./components/settings/SettingsWindow.vue";
import SketchPreview from "./components/SketchPreview.vue";
import SketchPreviewReload from "./components/SketchPreviewReload.vue";

pyodide.init()

window.electronAPI.sendMessage('Hello from App.vue!');

// Key to force remount SketchPreview components
const sketchKey = ref(0);
function reloadSketchPreviews() {
  sketchKey.value++;
}
// Global-ish settings driving child components
const preventDuringLive = ref(false)

function onSettingsChange(payload: any) {
  if (payload && payload.all && typeof payload.all.shouldAutocompilePython === 'boolean') {
    preventDuringLive.value = !payload.all.shouldAutocompilePython
  }
}

</script>

<template>
<!--  <div>-->
<!--    <a href="https://vitejs.dev" target="_blank">-->
<!--      <img :src="viteLogo" class="logo" alt="Vite logo" />-->
<!--    </a>-->
<!--    <a href="https://vuejs.org/" target="_blank">-->
<!--      <img :src="vueLogo" class="logo vue" alt="Vue logo" />-->
<!--    </a>-->
<!--  </div>-->
<!--  <HelloWorld msg="Vite + Vue" />-->
  <!-- Test case of using a live preview with hardcoded points for shapes -->
  <!-- Developer reload button for SketchPreview components -->
  <SketchPreviewReload @reload="reloadSketchPreviews" />
  <!-- Render a default shape -->
  <SketchPreview :key="'default-' + sketchKey"></SketchPreview>
  <!-- Render a triangle shape -->
  <SketchPreview
    :key="'triangle-' + sketchKey"
    :points="[
      { x: 50, y: 0, z: 0 },
      { x: 100, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 }
    ]"
    :filled="true"
    :position="{ x: 100, y: 0 }"
    :canvas_dimensions="{ width: 180, height: 100 }"
  ></SketchPreview>
  <ThreeSpinningCube></ThreeSpinningCube>
  <SettingsWindow @settings-change="onSettingsChange" />
  <PythonInputContext :prevent-automatic-code-update="preventDuringLive" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
