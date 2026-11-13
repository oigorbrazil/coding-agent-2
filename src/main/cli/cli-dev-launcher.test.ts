import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { ensureDevLauncher } from './cli-dev-launcher'

// Launcher paths must be absolute for the target platform, so each host checks its own layout.
it('writes the coding-agent alias beside the dev launcher', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-launcher-'))
  const entry = join(root, 'index.js')
  writeFileSync(entry, '')
  const windows = process.platform === 'win32'

  const launcher = await ensureDevLauncher({
    platform: windows ? 'win32' : 'linux',
    userDataPath: root,
    execPath: process.execPath,
    cliEntryPath: entry,
    commandName: 'orca-dev'
  })

  expect(launcher).not.toBeNull()
  const bin = join(root, 'cli', 'bin')
  expect(existsSync(join(bin, windows ? 'coding-agent.cmd' : 'coding-agent'))).toBe(true)
  if (!windows) {
    expect(existsSync(join(bin, 'orca'))).toBe(true)
  }
})
