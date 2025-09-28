<script setup lang="ts">
import { ref } from 'vue'
import SketchPreview from './SketchPreview.vue'
import ShapeExporter from './ShapeExporter.vue'

// start on SketchPreview
const currentComponent = ref<'SketchPreview' | 'ShapeExporter'>('SketchPreview')

function toggleComponent() {
  currentComponent.value =
    currentComponent.value === 'SketchPreview' ? 'ShapeExporter' : 'SketchPreview'
}
</script>

<template>
  <button @click="toggleComponent">
    Switch Component
  </button>

  <!-- Dynamic component rendering -->
  <component
    :is="currentComponent === 'SketchPreview' ? SketchPreview : ShapeExporter"
  />
</template>
