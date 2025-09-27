<script setup>
import { defineEmits } from 'vue';
// Emits a reload event when the button is clicked
const emit = defineEmits(['reload']);
</script>

<template>
  <button @click="emit('reload')" style="margin-bottom: 1em;">
    Reload SketchPreview
  </button>
</template>
