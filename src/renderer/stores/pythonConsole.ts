import { reactive } from 'vue'

export type PythonConsoleEntry = {
  kind: 'stdout' | 'stderr' | 'system'
  text: string
  ts: number
}

const state = reactive({
  logs: [] as PythonConsoleEntry[],
})

function reset() {
  state.logs.splice(0, state.logs.length)
}

function append(kind: PythonConsoleEntry['kind'], text: string) {
  if (!text) return
  state.logs.push({ kind, text, ts: Date.now() })
}

function appendStdout(text: string) {
  append('stdout', text)
}

function appendStderr(text: string) {
  append('stderr', text)
}

function appendSystem(text: string) {
  append('system', text)
}

export const pythonConsole = {
  state,
  reset,
  append,
  appendStdout,
  appendStderr,
  appendSystem,
}

export default pythonConsole
