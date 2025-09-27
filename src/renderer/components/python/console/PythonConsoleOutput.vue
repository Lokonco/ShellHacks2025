<!-- TODO: fix while loop bug -->
<!--
after 100 or so ms if locked,
scream at the user to get good + stop running python code
-->
<script setup lang="ts">
import { onUpdated, ref, watch } from 'vue'
import pythonConsole from '../../../stores/pythonConsole'

const containerRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  const el = containerRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(() => pythonConsole.state.logs.length, () => {
  // auto-scroll when new logs arrive
  requestAnimationFrame(scrollToBottom)
})

onUpdated(scrollToBottom)
</script>

<template>
  <div ref="containerRef" class="py-console">
    <div v-for="(entry, idx) in pythonConsole.state.logs" :key="entry.ts + ':' + idx" :class="['line', entry.kind]">
      <pre class="text">{{ entry.text }}</pre>
    </div>
  </div>
</template>

<style scoped>
.py-console {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  background: #0b0b0b;
  color: #e6e6e6;
  border: 1px solid #232323;
  border-radius: 6px;
  padding: 8px;
  height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
.line { display: block; }
.text { margin: 0; white-space: pre-wrap; word-break: break-word; }
.stdout .text { color: #e6e6e6; }
.stderr .text { color: #ff6b6b; }
.system .text { color: #8ab4f8; }
</style>