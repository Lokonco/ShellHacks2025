<script setup lang="ts">
import { computed } from 'vue'

// Define the normalized error shape used across components
export type NormalizedPythonError = {
  type: string
  message: string
  lineno: number
  offset: number
} | null

// v-model:error support
const props = defineProps<{
  error: NormalizedPythonError
}>()
const emit = defineEmits<{
  (e: 'update:error', value: NormalizedPythonError): void
}>()

// Derived bits for rendering convenience
const hasError = computed(() => !!props.error)

</script>

<template>
  <div v-if="hasError" class="error-box" role="alert" aria-live="assertive">
    <div class="err-title">
      {{ props.error!.type }} at line {{ props.error!.lineno }}
      <span v-if="props.error && props.error.offset"></span>
    </div>
    <div class="err-message">{{ props.error!.message }}</div>
  </div>
</template>

<style scoped>
.error-box {
  margin-top: 8px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ffb4b4;
  background: #fff4f4;
  color: #8b0000;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}
.err-title { font-weight: 700; }
.err-message { margin-top: 4px; white-space: pre-wrap; }

</style>
