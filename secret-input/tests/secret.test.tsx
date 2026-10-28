import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'secret-input',
  component: 'Pane',
  requestId: 'secret-input',
  props: {
    title: 'secret',
    isFocused: true,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('typed value is masked and reaches secrets add only on stdin', async ($, on) => {
  const runs: { argv: readonly string[]; stdin?: string }[] = []
  on('command.register', () => ({ value: { command: 'secret' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', (_, e) => {
    runs.push({ argv: e.argv, stdin: e.init?.stdin })
    return { value: { exitCode: 0, stdout: '', stderr: 'ok: TEST_KEY → lepida.env', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const run = (args: string) =>
    $.command.run({ command: 'secret', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const usage = await run('lepida TEST_KEY extra')
  expect(usage.text).toMatch(/^Uso:/)
  expect((await run('lepida')).text).toMatch(/^Uso:/)
  expect((await run('GITHUB_TOKEN')).text).toContain('github_token/GITHUB_TOKEN')

  await run('lepida TEST_KEY')
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    for (const key of ['s', '3', 'c', 'x']) await ui.key({ key, in: 'field' })
    await ui.key({ key: 'backspace', in: 'field' })
    await ui.key({ key: 'left', in: 'field' })
    const field = JSON.stringify(await ui.drawn({ in: 'field' }))
    expect(field).toContain('•••')
    expect(field).not.toContain('s3c')
    await ui.pointer({ type: 'down', x: 0, y: 0, button: 'left', in: 'field' })
    expect(JSON.stringify(await ui.drawn({ in: 'field' }))).toContain('▏')
    await ui.press({ key: 'toggle' })
    expect(JSON.stringify(await ui.drawn({ in: 'field' }))).toContain('s3c')
    await ui.press({ key: 'toggle' })
    expect(JSON.stringify(await ui.drawn({ in: 'field' }))).not.toContain('s3c')
    if (surface === 'terminal') {
      await ui.key({ key: 'return', in: 'field' })
      expect(runs).toHaveLength(1)
      expect(runs[0]?.argv.slice(-2)).toEqual(['lepida', 'TEST_KEY'])
      expect(runs[0]?.argv.join(' ')).not.toContain('s3c')
      expect(runs[0]?.stdin).toBe('s3c')
    }
    await ui.unmount()
  }
})
