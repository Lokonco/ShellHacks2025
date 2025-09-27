<!-- TODO: have a delay setting for text changes to prevent spamming the Python process -->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import pyodide from '../../pyodide-loader'
import {PyodideInterface} from "pyodide";

// Local state for the text box
const text = ref('')
const pyScriptElement = ref<HTMLElement | null>(null)

// Props: parent controls whether to prevent view context updates during live text changes
const props = defineProps<{
  preventAutomaticCodeUpdate?: boolean
}>()

// Track the latest value we suppressed while prevention was active
const pendingSuppressed = ref<string | null>(null)

// Keep track of the last value we actually emitted
const lastEmitted = ref<string>('')

// Emit an event whenever the text changes so parents can listen (kept for compatibility)
const emit = defineEmits<{
  (e: 'text-change', value: string): void
}>()

// Local handler for text change logic
function onTextChange(value: string) {
  console.log(value)
  updatePyScript(value)
}


async function updatePyScript(value: string) {
  console.log("updated")
  pyodide.onReady(
      async (pyodide: PyodideInterface) => {
        await pyodide.runPython("print(\"REEAW\")")
      }
  )

  // if (pyScriptElement.value) {
  //   document.body.removeChild(pyScriptElement.value)
  // }
  // pyScriptElement.value = document.createElement('py-script')
  // document.body.appendChild(pyScriptElement.value)
  // pyScriptElement.value.textContent = value
}

// Watch for any change to `text`. If prevention is active, hold off emitting
watch(text, (newVal) => {
  if (props.preventAutomaticCodeUpdate) {
    pendingSuppressed.value = newVal
    return
  }
  // Handle internally and emit immediately when not prevented
  lastEmitted.value = newVal
  onTextChange(newVal)
  emit('text-change', newVal)
})

// When prevention turns off, handle and emit the most recent suppressed text once
watch(
  () => props.preventAutomaticCodeUpdate,
  (now, prev) => {
    if (prev && !now && pendingSuppressed.value !== null) {
      const valueToEmit = pendingSuppressed.value
      pendingSuppressed.value = null
      lastEmitted.value = valueToEmit
      onTextChange(valueToEmit)
      emit('text-change', valueToEmit)
    }
  }
)

// Dynamically load the Python connector script in Vue context
const mpyScriptEl = ref<HTMLScriptElement | null>(null)
const createdByThis = ref(false)

onMounted(() => {
  const marker = 'python-connector'
  const existing = document.querySelector(`script[data-mpy-id="${marker}"]`) as HTMLScriptElement | null
  if (existing) {
    mpyScriptEl.value = existing
    createdByThis.value = false
    return
  }
  const s = document.createElement('script')
  s.type = 'mpy'
  s.setAttribute('data-mpy-id', marker)
  s.src = new URL('../../assets/py/PythonConnector.py', import.meta.url).toString()
  document.head.appendChild(s)
  mpyScriptEl.value = s
  createdByThis.value = true
})

onBeforeUnmount(() => {
  if (createdByThis.value && mpyScriptEl.value && mpyScriptEl.value.parentNode) {
    mpyScriptEl.value.parentNode.removeChild(mpyScriptEl.value)
  }
})
</script>

<template>

  <button type="button" id="my_button">run Python</button>

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
