<script setup lang="ts">
import { reactive, watch, computed } from 'vue'

/**
USAGE DOCS — SettingsWindow.vue

Purpose
- A self-contained settings panel that emits reactive-like events whenever a setting changes.
- Designed to feel like Angular signals: consumers can hook into a single "settings-change" event to react to updates.

Key concepts
- Auto Apply (button boolean):
  - When enabled, any change is immediately emitted.
  - When disabled, changes are buffered until the user clicks the Apply button. This is useful to avoid frequent re-renders while editing.
- Event payloads contain both the fine-grained change and the full settings snapshot so parents can decide how to react.
- Includes a sample setting: preventViewContextDuringLiveTextReload, demonstrating how a setting could guide the parent to suppress view updates during live text changes.

Emits
- 'settings-change': (payload: SettingsChangePayload)
  Fired whenever a setting changes. If autoApply is true, it's fired immediately; otherwise, it will fire on Apply for all pending changes.

- 'apply': (settings: Settings)
  Fired when the user clicks Apply (only meaningful when autoApply is false). This carries the full settings object.

Types
  type Settings = {
    preventViewContextDuringLiveTextReload: boolean
    // Add your settings here
  }

  type SettingsChange = {
    name: keyof Settings
    value: Settings[keyof Settings]
  }

  type SettingsChangePayload = {
    change?: SettingsChange            // Present for per-field updates when autoApply is true
    pending?: SettingsChange[]         // Present when autoApply is false and we apply batched changes
    all: Settings                      // Snapshot of all settings after the change/apply
    autoApply: boolean                 // Whether changes are being auto-applied
    source: 'user' | 'apply'           // Who triggered the emit
  }

How to use in a parent component
- Minimal example (immediate reactions):
  <SettingsWindow @settings-change="onSettingsChange" />

  function onSettingsChange(payload: SettingsChangePayload) {
    // You get both fine-grained change and full snapshot
    // Decide whether to update your stores or re-render views here
    console.log('settings-change', payload)
  }

- Batch apply example (suppress frequent re-renders while the user is editing):
  <SettingsWindow @settings-change="onSettingsChange" />

  function onSettingsChange(payload: SettingsChangePayload) {
    if (!payload.autoApply && payload.source === 'apply') {
      // Only react once when the user clicks Apply
      // payload.pending includes the list of field changes in this batch
      // payload.all is the full finalized settings snapshot
    }
  }

- Preventing a "view context" update during live text reloading (concept):
  You might want to prevent a dependent view (e.g., PythonViewContext) from re-rendering while text is changing rapidly. Do NOT implement that here; but here is how you would consume the signal:

  <SettingsWindow @settings-change="onSettingsChange" />
  <PythonViewContext :suppress-view-context="suppressViewContext" />

  const suppressViewContext = ref(false)
  function onSettingsChange(payload: SettingsChangePayload) {
    // Drive a parent-level flag based on the setting
    suppressViewContext.value = payload.all.preventViewContextDuringLiveTextReload
  }

Notes
- This file is the only modified file per the issue request.
- Extend the Settings type and the UI below with additional fields as needed.
*/

type Settings = {
  preventViewContextDuringLiveTextReload: boolean
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
  preventViewContextDuringLiveTextReload: false,
})

// Button boolean to control automatic emission like a signal
type UIState = {
  autoApply: boolean
  pending: SettingsChange[]
}
const ui = reactive<UIState>({
  autoApply: true,
  pending: [],
})

const hasPending = computed(() => !ui.autoApply && ui.pending.length > 0)

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

function onTogglePreventViewContext(value: boolean) {
  settings.preventViewContextDuringLiveTextReload = value
  queueChange({ name: 'preventViewContextDuringLiveTextReload', value })
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
            :checked="ui.autoApply"
            @change="onToggleAutoApply(($event.target as HTMLInputElement).checked)"
          />
          <span>Auto Apply</span>
        </label>
        <button
          class="apply-btn"
          :disabled="!hasPending"
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
          :checked="settings.preventViewContextDuringLiveTextReload"
          @change="onTogglePreventViewContext(($event.target as HTMLInputElement).checked)"
        />
        <span>Prevent view context during live text reload</span>
      </label>
      <p class="hint">
        When enabled, parents may choose to temporarily suppress heavy view updates while text is changing rapidly.
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
}
.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
</style>
