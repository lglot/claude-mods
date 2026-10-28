export type Target = { file: string; key: string }

declare module 'claude-code' {
  interface PluginState {
    'secret-input': { target: Target | null; note: string }
  }
}
