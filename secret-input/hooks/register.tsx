import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Target } from '../types'

const PANE = 'secret-input'
// Same name rules as the secrets CLI, checked before the pane opens.
const FILE = /^[a-z0-9._-]+$/
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/
// The desktop app's PATH may lack ~/.local/bin and Homebrew (sops); names go as $1 $2, never into the script.
const ADD = 'export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"; exec secrets add "$1" "$2"'

const target = atom({ plugin: 'secret-input', key: 'target' } as const, null)
const note = atom({ plugin: 'secret-input', key: 'note' } as const, '')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'secret',
      description: 'Salva un segreto nel vault da un campo mascherato: /secret <KEY> o /secret <file> <KEY>',
    })

    return next(e)
  })

  on('command.run', { command: 'secret' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/)
    // One word is a KEY alone, in a file named after it: the secrets CLI's own convention.
    const [file = '', key = '', ...rest] = words.length === 1 && /[A-Z]/.test(words[0] ?? '') ? [words[0]!.toLowerCase(), words[0]!] : words
    if (rest.length || !FILE.test(file) || !KEY.test(key)) {
      return { text: 'Uso: /secret <KEY> oppure /secret <file> <KEY>, es. /secret GITHUB_TOKEN. Il valore va nel pannello, mai nel comando.' }
    }
    const next: Target = { file, key }
    await update($, target, () => next)
    await update($, note, () => 'Clicca il campo, digita o incolla, Invio per salvare. Esc chiude.')
    await $.ui.open({ id: PANE, title: `secret ${file}/${key}`, focus: true, closeOnEscape: true })

    return { text: `Pannello aperto per ${file}/${key}: il valore non passa dal modello.` }
  })

  on('ui.message', { requestId: PANE }, async ($, e) => {
    const value = (e.data as { value?: unknown } | null)?.value
    const t = await read($, target)
    if (typeof value !== 'string' || !value || !t) return {}
    await update($, note, () => 'Salvo...')
    const r = await $.process
      .run(['/bin/sh', '-c', ADD, 'secret-input', t.file, t.key], { stdin: value, timeoutMs: 60_000 })
      .catch((err: unknown) => ({ exitCode: 1, stderr: String(err) }))
    // stderr carries only the CLI's own messages (ok, push failed, invalid name): never the value.
    const msg = r.stderr.trim().split('\n').slice(-2).join(' ') || `exit ${r.exitCode}`
    await update($, note, () => msg)
    if (r.exitCode === 0) {
      $.ui.toast(`${t.key} salvato in ${t.file}`)
      await update($, target, () => null)
      await $.ui.close({ id: PANE })
    }

    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const t = await read($, target)
    const msg = await read($, note)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text>Campo mascherato disponibile solo nel terminale e nell'app desktop.</Text>
    }
    const { Box, Text, Client } = $.ui.resolve(e)
    if (!t) return <Text dimColor>Usa /secret &lt;KEY&gt; o /secret &lt;file&gt; &lt;KEY&gt;.</Text>

    return (
      <Box flexDirection="column">
        <Text bold>{t.file}/{t.key}</Text>
        <Client key="field" module="./masked-field.tsx" width="100%" />
        <Text dimColor>{msg}</Text>
      </Box>
    )
  })
}
