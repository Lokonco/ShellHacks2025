<script setup lang="ts">
import { ref, watch } from 'vue'

// Local state for the text box
const text = ref('')

// Emit an event whenever the text changes so parents can listen
const emit = defineEmits<{
  (e: 'text-change', value: string): void
}>()

// Watch for any change to `text` and emit it
watch(text, (newVal) => {
  emit('text-change', newVal)
})
</script>

<template>
  <div class="python-view-context">
    <label class="input-label" for="python-text-input">Enter text:</label>
    <input
      id="python-text-input"
      class="text-input"
      type="text"
      v-model="text"
      placeholder="Type here..."
    />
    <!-- 
      Parents can listen like: 
      <PythonViewContext @text-change="onTextChange" />
    -->
  </div>
</template>

<style scoped>
.python-view-context {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 420px;
}

.input-label {
  font-weight: 600;
}

.text-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  outline: none;
}

.text-input:focus {
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
}
</style>
