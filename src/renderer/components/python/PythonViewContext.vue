<!-- TODO: have a delay setting for text changes to prevent spamming the Python process -->
<script setup lang="ts">
import { ref, watch } from 'vue'

// Local state for the text box
const text = ref('')

// Props: parent controls whether to prevent view context updates during live text changes
const props = defineProps<{
  preventAutomaticCodeUpdate?: boolean
}>()

// Track the latest value we suppressed while prevention was active
const pendingSuppressed = ref<string | null>(null)

// Keep track of the last value we actually emitted
const lastEmitted = ref<string>('')

// Emit an event whenever the text changes so parents can listen
const emit = defineEmits<{
  (e: 'text-change', value: string): void
}>()

// Watch for any change to `text`. If prevention is active, hold off emitting
watch(text, (newVal) => {
  if (props.preventAutomaticCodeUpdate) {
    pendingSuppressed.value = newVal
    return
  }
  // Emit immediately when not prevented
  lastEmitted.value = newVal
  emit('text-change', newVal)
})

// When prevention turns off, emit the most recent suppressed text once
watch(
  () => props.preventAutomaticCodeUpdate,
  (now, prev) => {
    if (prev && !now && pendingSuppressed.value !== null) {
      const valueToEmit = pendingSuppressed.value
      pendingSuppressed.value = null
      lastEmitted.value = valueToEmit
      emit('text-change', valueToEmit)
    }
  }
)
</script>

<template>
  <div class="python-view-context">
    <label class="input-label" for="python-text-input">Enter text:</label>
    <textarea
      id="python-text-input"
      class="text-input"
      v-model="text"
      placeholder="Type here..."
    ></textarea>
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
  height: 160px; /* fixed window height */
  overflow-y: auto; /* show internal scrollbar when content exceeds height */
  resize: none; /* keep window fixed; prevent user resizing */
  box-sizing: border-box; /* keep padding/border inside fixed height */
}

.text-input:focus {
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
}
</style>
