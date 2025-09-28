<!-- TODO: have a delay setting for text changes to prevent spamming the Python process -->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import pyodide from '../../pyodide-loader'
import {PyodideInterface} from "pyodide";
import {PythonError} from "pyodide/ffi";
import PythonErrorPreview from './console/PythonErrorPreview.vue'
import pythonConsole from '../../stores/pythonConsole'
import { installPyToJsSketchBridge } from '../../utils/installPyToJsSketchBridge'
import ExportButton from '../ExportButton.vue';


// Allow parent to pass attrs (class/style) to the editor wrapper
// so width/height can be controlled externally
defineOptions({ inheritAttrs: false })

const redAlertUrl = new URL('../../assets/red-alert-icon.svg', import.meta.url).toString()

// Error info for Approach B (runtime try/catch)
const compileError = ref<null | {
  type: string
  message: string
  lineno: number
  offset: number
}>(null)

// Local state for the text box
const text = ref('')
const pyScriptElement = ref<HTMLElement | null>(null)

// Line numbers gutter support
const textAreaRef = ref<HTMLTextAreaElement | null>(null)
const gutterRef = ref<HTMLDivElement | null>(null)
const editorWrapperRef = ref<HTMLDivElement | null>(null)
const lineNumbers = computed(() => {
  const lines = (text.value ? text.value.split('\n').length : 1) || 1
  return Array.from({ length: lines }, (_, i) => i + 1)
})

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

async function updatePyScript(code: string) {
  // Reset console for a new compile/run
  pythonConsole.reset()
  pythonConsole.appendSystem('Running Python...\n')
  pyodide.onReady(
      async (py: PyodideInterface) => {
        try {
          // Install our JS bridge once to receive points from Python
          installPyToJsSketchBridge(py)
          // Use async execution to avoid blocking the UI
          // @ts-ignore runPythonAsync exists in Pyodide 0.28+
          if (typeof (py as any).runPythonAsync === 'function') {
            await (py as any).runPythonAsync(code)
          } else {
            // Fallback for older versions
            py.runPython(code)
          }
          // Clear any previous error on success
          compileError.value = null
        } catch (e) {
          const err = e as PythonError
          const errAny = err as any
          const msg = errAny?.message || String(e)
          const type = errAny?.type || errAny?.name || 'Error'
          // Also surface to console output
          pythonConsole.appendStderr((type ? type + ': ' : '') + msg + '\n')
          // Determine lineno as the earliest occurrence mentioned in the traceback/message
          let lineno: number | undefined
          const allLineMatches = Array.from((msg || '').matchAll(/line\s+(\d+)/ig))
          if (allLineMatches.length) {
            const nums = allLineMatches.map(m => Number(m[1])).filter(n => Number.isFinite(n))
            if (nums.length) lineno = Math.min(...nums)
          }
          // Fall back to structured lineno when message doesn't include it
          if (lineno === undefined && typeof errAny?.lineno === 'number') {
            lineno = errAny.lineno
          }
          let offset: number | undefined = typeof errAny?.offset === 'number' ? errAny.offset : undefined
          // Fallback to regex extraction from message for column
          if (!offset) {
            const m2 = (msg || '').match(/column\s+(\d+)/i)
            if (m2) offset = Number(m2[1])
          }
          // Defaults
          if (!lineno) lineno = 1
          if (!offset) offset = 1
          compileError.value = {
            type,
            message: msg,
            lineno,
            offset,
          }
        }
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

// Measurements for overlay positioning
const lineHeightPx = ref<number>(0)
const paddingTopPx = ref<number>(0)
const paddingLeftPx = ref<number>(0)
const borderTopPx = ref<number>(0)
const borderLeftPx = ref<number>(0)
const scrollTopRef = ref<number>(0)
const scrollLeftRef = ref<number>(0)
const gutterWidthPx = ref<number>(0)
const overlayReady = ref(false)

// Mirror element to measure text width for the error line
const mirrorRef = ref<HTMLPreElement | null>(null)

const overlayTop = computed(() => {
  if (!compileError.value) return 0
  const lineCount = (text.value ? text.value.split('\n').length : 1) || 1
  const lineIndex = Math.min(lineCount - 1, Math.max(0, (compileError.value.lineno || 1) - 1))
  return (gutterRef.value ? gutterRef.value.offsetTop : 0) + borderTopPx.value + paddingTopPx.value - scrollTopRef.value + lineIndex * lineHeightPx.value
})

const wrapperClientHeight = computed(() => editorWrapperRef.value ? (editorWrapperRef.value.clientHeight || 0) : 0)

const overlayTopVisual = computed(() => {
  const ch = wrapperClientHeight.value
  if (ch <= 0) return 0
  const top = overlayTop.value
  const visibleTop = Math.max(0, Math.min(ch, top))
  const bottom = top + lineHeightPx.value
  const visibleBottom = Math.max(0, Math.min(ch, bottom))
  // if no intersection, keep any value; visibility is controlled elsewhere
  return visibleBottom > visibleTop ? visibleTop : 0
})

const overlayHeightVisual = computed(() => {
  const ch = wrapperClientHeight.value
  if (ch <= 0) return 0
  const top = overlayTop.value
  const bottom = top + lineHeightPx.value
  const visibleTop = Math.max(0, Math.min(ch, top))
  const visibleBottom = Math.max(0, Math.min(ch, bottom))
  return Math.max(0, visibleBottom - visibleTop)
})

const overlayVisible = computed(() => {
  if (!compileError.value || !overlayReady.value) return false
  return overlayHeightVisual.value > 0
})

const lineTextWidthPx = ref<number>(0)

function measureLineEnd() {
  const mirror = mirrorRef.value
  const ta = textAreaRef.value
  if (!mirror || !ta || !compileError.value) {
    lineTextWidthPx.value = 0
    return
  }
  // Ensure mirror matches textarea font styles for accurate width
  const taStyles = getComputedStyle(ta)
  mirror.style.fontFamily = taStyles.fontFamily
  mirror.style.fontSize = taStyles.fontSize
  mirror.style.lineHeight = taStyles.lineHeight
  mirror.style.tabSize = (taStyles as any).tabSize || '8'
  const lines = (text.value || '').split('\n')
  const idx = Math.max(0, Math.min(lines.length - 1, (compileError.value.lineno || 1) - 1))
  const lineText = lines[idx] || ''
  mirror.textContent = lineText
  // scrollWidth gives us the actual content width in pixels
  lineTextWidthPx.value = mirror.scrollWidth || mirror.clientWidth || 0
}

const iconLeftPx = computed(() => {
  // left of editor wrapper + gutter + textarea left border/padding + measured content - scrollLeft
  return gutterWidthPx.value + borderLeftPx.value + paddingLeftPx.value + lineTextWidthPx.value - scrollLeftRef.value
})

const iconSizePx = computed(() => {
  // slightly smaller than line box height
  return Math.min(14, Math.max(10, lineHeightPx.value * 0.75))
})

const iconTopVisual = computed(() => {
  // center icon within the visible line area using the actual icon size
  const centerTop = overlayTopVisual.value + Math.max(0, (overlayHeightVisual.value - iconSizePx.value) / 2)
  return centerTop
})

function measureOverlay() {
  const ta = textAreaRef.value
  const gut = gutterRef.value
  if (!ta || !gut) return
  const taStyles = getComputedStyle(ta)
  const gutStyles = getComputedStyle(gut)

  const fontSize = parseFloat(taStyles.fontSize || '14') || 14
  const lhStr = taStyles.lineHeight || ''
  let lhPx: number

  if (lhStr === 'normal' || lhStr === '' || lhStr === 'initial' || lhStr === 'inherit') {
    lhPx = fontSize * 1.4
  } else if (lhStr.endsWith('px')) {
    lhPx = parseFloat(lhStr)
  } else {
    const numeric = parseFloat(lhStr)
    if (!isNaN(numeric)) {
      lhPx = numeric * fontSize
    } else {
      lhPx = fontSize * 1.4
    }
  }

  const minLh = Math.max(fontSize * 1.1, 12)
  if (!lhPx || isNaN(lhPx) || lhPx < minLh) {
    lhPx = minLh
  }

  lineHeightPx.value = lhPx
  paddingTopPx.value = parseFloat(gutStyles.paddingTop || '0') || 0
  borderTopPx.value = parseFloat(gutStyles.borderTopWidth || '0') || 0
  paddingLeftPx.value = parseFloat(taStyles.paddingLeft || '0') || 0
  borderLeftPx.value = parseFloat(taStyles.borderLeftWidth || '0') || 0
  gutterWidthPx.value = gut.offsetWidth
  scrollTopRef.value = ta.scrollTop
  scrollLeftRef.value = ta.scrollLeft
  overlayReady.value = true
  // measure the error line end position whenever we re-measure
  measureLineEnd()
}

onMounted(() => {
  const marker = 'python-connector'
  const existing = document.querySelector(`script[data-mpy-id="${marker}"]`) as HTMLScriptElement | null
  if (existing) {
    mpyScriptEl.value = existing
    createdByThis.value = false
  } else {
    const s = document.createElement('script')
    s.type = 'mpy'
    s.setAttribute('data-mpy-id', marker)
    s.src = new URL('../../assets/py/PythonConnector.py', import.meta.url).toString()
    document.head.appendChild(s)
    mpyScriptEl.value = s
    createdByThis.value = true
  }

  // Sync gutter scroll with textarea scroll and track horizontal scroll for icon positioning
  const syncScroll = () => {
    if (gutterRef.value && textAreaRef.value) {
      gutterRef.value.scrollTop = textAreaRef.value.scrollTop
      scrollTopRef.value = textAreaRef.value.scrollTop
      scrollLeftRef.value = textAreaRef.value.scrollLeft
    }
    // re-measure icon position when scrolling
    measureLineEnd()
  }
  if (textAreaRef.value) {
    textAreaRef.value.addEventListener('scroll', syncScroll)
  }
  // initial measure and on resize
  measureOverlay()
  const onResize = () => measureOverlay()
  window.addEventListener('resize', onResize)

  // store handlers on ref to remove later
  ;(textAreaRef as any)._syncScroll = syncScroll
  ;(textAreaRef as any)._onResize = onResize
})

// Recalculate overlay when text or error state changes so highlight stays in sync
watch([text, compileError], async () => {
  await nextTick()
  measureOverlay()
})

onBeforeUnmount(() => {
  if (createdByThis.value && mpyScriptEl.value && mpyScriptEl.value.parentNode) {
    mpyScriptEl.value.parentNode.removeChild(mpyScriptEl.value)
  }
  // remove scroll listener if present
  const ta = textAreaRef.value as any
  if (ta && ta._syncScroll) {
    ta.removeEventListener('scroll', ta._syncScroll)
    delete ta._syncScroll
  }
  if (ta && ta._onResize) {
    window.removeEventListener('resize', ta._onResize)
    delete ta._onResize
  }
})
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

function updateTooltipPos(e: MouseEvent) {
  const wrapper = editorWrapperRef.value
  if (!wrapper) return
  const rect = wrapper.getBoundingClientRect()
  let x = e.clientX - rect.left + 12
  let y = e.clientY - rect.top + 12
  // Clamp inside wrapper bounds with a small margin
  const margin = 8
  const maxX = rect.width - margin
  const maxY = rect.height - margin
  if (x > maxX) x = maxX
  if (y > maxY) y = maxY
  if (x < margin) x = margin
  if (y < margin) y = margin
  tooltipX.value = x
  tooltipY.value = y
}

function onIconEnter(e: MouseEvent) {
  updateTooltipPos(e)
  tooltipVisible.value = true
}
function onIconMove(e: MouseEvent) {
  if (!tooltipVisible.value) return
  updateTooltipPos(e)
}
function onIconLeave() {
  tooltipVisible.value = false
}
</script>

<template>

  <button type="button" id="my_button">run Python</button>
  <ExportButton>Download</ExportButton>
  

  <div class="python-view-context">
    <label class="input-label" for="python-text-input">Enter text:</label>

    <div class="editor-wrapper" ref="editorWrapperRef" v-bind="$attrs">
      <!-- overlay highlight spanning gutter and textarea -->
      <div
        v-if="compileError && overlayReady && overlayVisible"
        class="line-overlay"
        :style="{ top: overlayTopVisual + 'px', height: overlayHeightVisual + 'px' }"
        aria-hidden="true"
      />
      <!-- error icon at end of error line text -->
      <img
        v-if="compileError && overlayReady && overlayVisible"
        class="error-icon"
        :src="redAlertUrl"
        :style="{ top: iconTopVisual + 'px', left: iconLeftPx + 'px', height: iconSizePx + 'px' }"
        alt="error"
        aria-hidden="true"
        @mouseenter="onIconEnter"
        @mousemove="onIconMove"
        @mouseleave="onIconLeave"
      />
      <!-- moving tooltip with PythonErrorPreview shown only while hovering the error icon -->
      <div
        v-if="tooltipVisible && compileError && overlayReady && overlayVisible"
        class="error-tooltip"
        :style="{ top: tooltipY + 'px', left: tooltipX + 'px' }"
        aria-hidden="true"
      >
        <div class="tooltip-inner">
          <PythonErrorPreview :error="compileError" />
        </div>
      </div>
      <div class="line-gutter" ref="gutterRef" aria-hidden="true">
        <div
          v-for="n in lineNumbers"
          :key="n"
          class="gutter-line"
          :class="{ error: compileError && compileError.lineno === n }"
        >{{ n }}</div>
      </div>
      <textarea
        id="python-text-input"
        class="text-input code-area"
        ref="textAreaRef"
        v-model="text"
        placeholder="Type here..."
        wrap="off"
        spellcheck="false"
      ></textarea>
      <!-- hidden mirror for measuring line width -->
      <pre ref="mirrorRef" class="measure-mirror" aria-hidden="true"></pre>
    </div>

    <!--
      Parents can listen like:
      <PythonInputContext @text-change="onTextChange" />
    -->
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
.err-line { white-space: pre; color: #444; }
.python-view-context {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.input-label {
  font-weight: 600;
}

/* Editor with line numbers */
.editor-wrapper {
  display: flex;
  align-items: stretch;
  position: relative; /* for absolute overlay positioning */
  overflow: hidden; /* clip overlay strictly to the scroll viewport */
  /* Size is now controlled externally via attrs (inline style or parent CSS). */
}

.line-gutter {
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  border: 1px solid #ccc;
  border-right: none;
  border-radius: 6px 0 0 6px;
  background: #f7f7f7;
  color: #666;
  min-width: 2.25rem; /* enough for 2-3 digits */
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.4;
  height: 100%;
  box-sizing: border-box; /* match textarea sizing model so heights align */
  overflow: auto; /* keep scroll mechanics for sync */
  scrollbar-width: none; /* Firefox: hide scrollbar */
  -ms-overflow-style: none; /* IE/Edge (legacy): hide scrollbar */
}
.line-gutter::-webkit-scrollbar {
  width: 0;
  height: 0; /* Chrome/Safari/Opera: hide scrollbar */
}
.gutter-pre { margin: 0; }
.gutter-line {
  line-height: 1.4;
  padding: 0 0.25rem;
  border-radius: 3px;
}
.gutter-line.error {
  /* keep a subtle color change in gutter numbers, but no red box here */
  background: transparent;
  color: #a8071a;
  font-weight: 700;
  border: none;
  margin-left: 0;
  margin-right: 0;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

/* overlay highlight across gutter and textarea */
.line-overlay {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(255, 77, 79, 0.2); /* slightly stronger, still subtle */
  border-top: 1px solid rgba(255, 77, 79, 0.28);
  border-bottom: 1px solid rgba(255, 77, 79, 0.28);
  pointer-events: none;
  z-index: 10; /* ensure above gutter and textarea */
}

/* error icon positioned over the editor, clipped by wrapper */
.error-icon {
  position: absolute;
  width: auto;
  z-index: 12;
  cursor: pointer;
  pointer-events: auto;
}

/* hidden mirror used to measure line text width accurately */
.measure-mirror {
  position: absolute;
  visibility: hidden;
  white-space: pre;
  top: -10000px;
  left: -10000px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.4;
  tab-size: 8;
}

.text-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  outline: none;
  height: 100%; /* fill editor-wrapper height */
  overflow-y: auto; /* show internal scrollbar when content exceeds height */
  overflow-x: auto; /* allow horizontal scroll when wrap is off */
  resize: none; /* keep window fixed; prevent user resizing */
  box-sizing: border-box; /* keep padding/border inside fixed height */
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.4;
  tab-size: 8;
}

/* When used as code area next to gutter, adjust borders to merge nicely */
.code-area {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none;
  flex: 1 1 auto;
}

.text-input:focus {
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
}
.error-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none; /* ensure hover tracking stays on the icon */
}
.tooltip-inner {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
  max-width: 380px;
  padding: 6px;
}

</style>
