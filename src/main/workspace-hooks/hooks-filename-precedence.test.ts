import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { hasHooksFile, hookConfigWarning, loadHooks } from './hooks'
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})
it.each([
  [false, false, undefined],
  [false, true, 'echo legacy'],
  [true, false, 'echo primary'],
  [true, true, 'echo primary']
] as const)('selects config with primary=%s legacy=%s', (primary, legacy, expected) => {
  const root = mkdtempSync(join(tmpdir(), 'coding-hooks-'))
  roots.push(root)
  if (primary) {
    writeFileSync(join(root, 'coding.yaml'), 'scripts:\n  setup: echo primary\n')
  }
  if (legacy) {
    writeFileSync(join(root, 'orca.yaml'), 'scripts:\n  setup: echo legacy\n')
  }
  expect(loadHooks(root)?.scripts.setup).toBe(expected)
  expect(hasHooksFile(root)).toBe(primary || legacy)
  expect(hookConfigWarning(root)).toBe(
    primary && legacy ? 'Both coding.yaml and orca.yaml exist; using coding.yaml.' : undefined
  )
  expect(existsSync(join(root, 'coding.yaml'))).toBe(primary)
  if (legacy) {
    expect(readFileSync(join(root, 'orca.yaml'), 'utf8')).toBe('scripts:\n  setup: echo legacy\n')
  }
})
it('does not execute legacy commands when the primary file is invalid', () => {
  const root = mkdtempSync(join(tmpdir(), 'coding-hooks-'))
  roots.push(root)
  writeFileSync(join(root, 'coding.yaml'), '[')
  writeFileSync(join(root, 'orca.yaml'), 'scripts:\n  setup: echo legacy\n')
  expect(loadHooks(root)).toBeNull()
})
