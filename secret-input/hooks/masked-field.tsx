import type { ClientModule, JsonValue } from 'claude-code'

type Field = { value: string; show: boolean; focused: boolean; blink: boolean }

// Named keys the surface sends; anything else is typed or pasted text.
const NAMED = new Set(['up', 'down', 'left', 'right', 'tab', 'pageup', 'pagedown', 'home', 'end', 'delete', 'escape'])
const EMPTY: Field = { value: '', show: false, focused: false, blink: true }

// The value lives only in this instance's local state until Enter posts it.
const MaskedField: ClientModule<JsonValue, Field> = (_props, s) => {
  const { Box, Text, Button } = s.elements
  const set = (patch: Partial<Field>) => s.setState({ ...(s.state ?? EMPTY), ...patch })
  if (s.state === undefined) {
    s.setState(EMPTY)
    // A click gives the region the keys: from then on the caret shows.
    s.onPointer(p => {
      if (p.type === 'down') set({ focused: true, blink: true })
    })
    s.every(530, () => {
      if (s.state?.focused) set({ blink: !s.state.blink })
    })
    s.onKey(k => {
      const value = s.state?.value ?? ''
      if (k.key === 'return') {
        if (value) s.post({ value })
        set({ value: '', show: false, blink: true })
      } else if (k.key === 'backspace') {
        set({ value: value.slice(0, -1), focused: true, blink: true })
      } else if (!k.ctrl && !k.meta && !NAMED.has(k.key)) {
        set({ value: value + k.key, focused: true, blink: true })
      }
    })
  }
  const f = s.state ?? EMPTY
  const shown = f.show ? f.value : '•'.repeat([...f.value].length)

  // Field grows to fill the row and the toggle sits fixed at its right edge, whatever the length typed.
  return (
    <Box flexDirection="row" width="100%" alignItems="center">
      <Box flexGrow={1} flexShrink={1} borderStyle="round" borderDimColor={!f.focused} paddingX={1} overflow="hidden">
        <Text mono wrap="truncate-start">
          {shown || (f.focused ? '' : <Text dimColor>clicca qui e digita</Text>)}
          {f.focused ? (f.blink ? '▏' : ' ') : ''}
        </Text>
      </Box>
      <Box marginLeft={1} flexShrink={0}>
        <Button key="toggle" dimColor onPress={() => set({ show: !f.show })}>
          {f.show ? 'nascondi' : 'mostra'}
        </Button>
      </Box>
    </Box>
  )
}

export default MaskedField
