import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { ensureDevLauncher } from './cli-dev-launcher'

it('writes the coding-agent alias beside the dev launcher', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-launcher-'))
  const entry = join(root, 'index.js')
  writeFileSync(entry, '')

  const windows = await ensureDevLauncher({
    platform: 'win32',
    userDataPath: join(root, 'windows'),
    execPath: process.execPath,
    cliEntryPath: entry,
    commandName: 'orca-dev'
  })
  expect(windows).not.toBeNull()
  expect(existsSync(join(root, 'windows', 'cli', 'bin', 'coding-agent.cmd'))).toBe(true)

  const linux = await ensureDevLauncher({
    platform: 'linux',
    userDataPath: join(root, 'linux'),
    execPath: '/usr/bin/electron',
    cliEntryPath: entry,
    commandName: 'orca-dev'
  })
  expect(linux).not.toBeNull()
  expect(existsSync(join(root, 'linux', 'cli', 'bin', 'coding-agent'))).toBe(true)
  expect(existsSync(join(root, 'linux', 'cli', 'bin', 'orca'))).toBe(true)
})
