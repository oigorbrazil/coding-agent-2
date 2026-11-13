import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { getSharedDevUserDataPath, resolveDevProfile } from './dev-instance-isolation.mjs'
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})
it.each([
  [false, false, 'coding-agent-2-dev'],
  [true, false, 'coding-agent-2-dev'],
  [false, true, 'coding-agent-2-orca-dev'],
  [true, true, 'coding-agent-2-dev']
])('selects primary=%s legacy=%s without copying', (primary, legacy, expected) => {
  const root = mkdtempSync(join(tmpdir(), 'coding-dev-path-'))
  roots.push(root)
  if (primary) {
    mkdirSync(join(root, 'coding-agent-2-dev'))
  }
  if (legacy) {
    mkdirSync(join(root, 'coding-agent-2-orca-dev'))
  }
  const env = { APPDATA: root }
  expect(getSharedDevUserDataPath(env, 'win32')).toBe(join(root, expected))
  expect(existsSync(join(root, 'coding-agent-2-dev'))).toBe(primary)
  expect(
    resolveDevProfile({
      repoRoot: root,
      env: { ...env, ORCA_DEV_USER_DATA_PATH: join(root, 'override') },
      platform: 'win32'
    }).userDataPath
  ).toBe(join(root, 'override'))
})
