import { reactive } from 'vue'

const state = reactive({
  latest: '' as string,
})

function set(code: string) {
  state.latest = String(code ?? '')
}

function get(): string {
  return state.latest
}

export const pythonCode = {
  state,
  set,
  get,
}

export default pythonCode
