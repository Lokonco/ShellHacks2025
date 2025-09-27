<script setup lang="ts">
import { reactive, watch, computed } from 'vue'

/**
USAGE DOCS — SettingsWindow.vue

What this is
- A self‑contained settings panel that emits a single "settings-change" event with both granular changes and a full snapshot.
- Feels like Angular signals: subscribe once; react everywhere.

Where to render
- Render exactly once at the application root (e.g., App.vue). Treat it as the source of truth for UI‑driven settings and propagate values to child components via props or a store.

Key behaviors
- Auto Apply (button boolean):
  - When enabled, every change emits immediately via 'settings-change' with a change field and an all snapshot.
  - When disabled, changes are buffered until the user clicks Apply. On Apply, a single 'settings-change' fires with pending[] and the all snapshot.
- Apply button UX: the button briefly greys out after clicking to indicate activity, but repeat clicks during that brief period won’t emit duplicate apply events.
- Sample setting provided: shouldAutocompilePython, controls whether Python code is auto-compiled during live edits.

Emitted events
- 'settings-change': (payload: SettingsChangePayload)
  Fired on each auto‑applied change or once on Apply when batching.
- 'apply': (settings: Settings)
  Fired when the user clicks Apply (useful if you want a separate hook). Only meaningful when Auto Apply is off.

Types
  type Settings = {
    shouldAutocompilePython: boolean
    // Add additional settings here as needed
  }

  type SettingsChange = {
    name: keyof Settings
    value: Settings[keyof Settings]
  }

  type SettingsChangePayload = {
    change?: SettingsChange            // Present for per‑field updates when autoApply is true
    pending?: SettingsChange[]         // Present when autoApply is false and we apply batched changes
    all: Settings                      // Snapshot after the change/apply
    autoApply: boolean                 // Whether changes are being auto‑applied
    source: 'user' | 'apply'           // Who triggered the emit
  }

Recommended usage in App.vue (root‑only)
  <!-- template pseudo‑usage -->
  <SettingsWindow @settings-change="onSettingsChange" />
  <PythonInputContext :prevent-during-live="preventDuringLive" />
  <!-- Pass other settings to other children as needed -->

  // App‑side setup (script)
  // const preventDuringLive = ref(false)
  // function onSettingsChange(payload: SettingsChangePayload) {
  //   // Update central reactive state or a store from the snapshot
  //   preventDuringLive.value = !!payload.all.shouldAutocompilePython
  // }

Batch apply pattern (to avoid frequent re-renders while editing)
- You don’t need special handling — just listen for settings-change and react only when payload.source === 'apply' and !payload.autoApply if that suits your logic:

  function onSettingsChange(payload: SettingsChangePayload) {
    if (!payload.autoApply && payload.source === 'apply') {
      // React once for the whole batch
      // payload.pending => list of field changes in the batch
      // payload.all     => finalized settings snapshot
    }
  }

Notes
- Render once at the root and fan out values via props, provide/inject, or a store.
- Extend the Settings type and UI below with additional fields as your app grows.
*/

type Settings = {
  shouldAutocompilePython: boolean
}

type SettingsChange = {
  name: keyof Settings
  value: Settings[keyof Settings]
}

type SettingsChangePayload = {
  change?: SettingsChange
  pending?: SettingsChange[]
  all: Settings
  autoApply: boolean
  source: 'user' | 'apply'
}

const emit = defineEmits<{
  (e: 'settings-change', payload: SettingsChangePayload): void
  (e: 'apply', settings: Settings): void
}>()

// Local, reactive settings state
const settings = reactive<Settings>({
  shouldAutocompilePython: true,
})

// Button boolean to control automatic emission like a signal
type UIState = {
  autoApply: boolean
  pending: SettingsChange[]
  applyCoolingDown: boolean
}
const ui = reactive<UIState>({
  autoApply: true,
  pending: [],
  applyCoolingDown: false,
})

// Wire checkboxes via v-model and react with watches to avoid template TS casts
watch(
  () => ui.autoApply,
  (val) => {
    onToggleAutoApply(val)
  }
)

watch(
  () => settings.shouldAutocompilePython,
  (val) => {
    // Emit or queue the change when the setting toggles
    queueChange({ name: 'shouldAutocompilePython', value: val })
  }
)

function queueChange(change: SettingsChange) {
  if (ui.autoApply) {
    emit('settings-change', {
      change,
      all: { ...settings },
      autoApply: true,
      source: 'user',
    })
  } else {
    // Buffer the change. If same field is changed multiple times, keep the last one.
    const idx = ui.pending.findIndex((c) => c.name === change.name)
    if (idx >= 0) ui.pending.splice(idx, 1, change)
    else ui.pending.push(change)
  }
}

function onToggleAutoApply(value: boolean) {
  ui.autoApply = value
  // If switching to auto, immediately emit consolidated snapshot to synchronize
  if (ui.autoApply && ui.pending.length > 0) {
    emit('settings-change', {
      pending: [...ui.pending],
      all: { ...settings },
      autoApply: true,
      source: 'user',
    })
    ui.pending.length = 0
  }
}

function onApply() {
  if (ui.autoApply) return
  if (ui.applyCoolingDown) return // allow clicks but skip firing during cooldown
  ui.applyCoolingDown = true
  setTimeout(() => {
    ui.applyCoolingDown = false
  }, 100)
  emit('settings-change', {
    pending: [...ui.pending],
    all: { ...settings },
    autoApply: false,
    source: 'apply',
  })
  emit('apply', { ...settings })
  ui.pending.length = 0
}
</script>

<template>
  <div class="settings-window">
    <header class="settings-header">
      <h2>Settings</h2>
      <div class="auto-apply">
        <label class="switch">
          <input
            type="checkbox"
            v-model="ui.autoApply"
          />
          <span>Auto Apply</span>
        </label>
        <button
          class="apply-btn"
          :class="{ cooling: ui.applyCoolingDown }"
          :disabled="ui.autoApply"
          @click="onApply"
          title="Apply pending changes"
        >
          Apply
        </button>
      </div>
    </header>

    <section class="setting">
      <label class="switch">
        <input
          type="checkbox"
          v-model="settings.shouldAutocompilePython"
        />
        <span>Autocompile Python while editing</span>
      </label>
      <p class="hint">
        When enabled, Python code will auto-compile as you edit.
      </p>
    </section>

    <!-- Add more settings sections here following the same pattern -->
  </div>
</template>

<style scoped>
.settings-window {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 720px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auto-apply {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.apply-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: #f7f7f7;
  cursor: pointer;
  transition: opacity 0.15s ease-in-out;
}
.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.apply-btn.cooling {
  opacity: 0.5; /* greyed out look during cooldown */
  cursor: pointer; /* still clickable */
}

.setting {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}

/* Accessibility: suppress orange click focus, keep keyboard focus */
.settings-window :focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}

.settings-window button:focus,
.settings-window button:active {
  outline: none;
  box-shadow: none;
}

.settings-window input[type="checkbox"]:focus {
  outline: none;
  box-shadow: none;
}

/* On touch devices, prevent tap highlight */
.settings-window {
  -webkit-tap-highlight-color: transparent;
}
</style>

