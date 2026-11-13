import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { readPluginManifestText } from './plugin-manifest-file'
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})
it.each([
  [false, true, 'legacy'],
  [true, false, 'primary'],
  [true, true, 'primary']
] as const)('reads primary=%s legacy=%s', async (primary, legacy, expected) => {
  const root = mkdtempSync(join(tmpdir(), 'coding-manifest-'))
  roots.push(root)
  if (primary) {
    writeFileSync(join(root, 'coding-plugin.json'), 'primary')
  }
  if (legacy) {
    writeFileSync(join(root, 'orca-plugin.json'), 'legacy')
  }
  expect(await readPluginManifestText(root)).toBe(expected)
  expect(existsSync(join(root, 'coding-plugin.json'))).toBe(primary)
  if (legacy) {
    expect(readFileSync(join(root, 'orca-plugin.json'), 'utf8')).toBe('legacy')
  }
})
it('reports a missing manifest', async () => {
  const root = mkdtempSync(join(tmpdir(), 'coding-manifest-'))
  roots.push(root)
  await expect(readPluginManifestText(root)).rejects.toMatchObject({ code: 'ENOENT' })
})
