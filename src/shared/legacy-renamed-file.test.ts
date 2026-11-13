import { removeTreeSync } from './windows-transient-lock-removal'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renamedUserDataFile, resolveLegacyRenamedFile } from './legacy-renamed-file'

let directory: string
let current: string
let legacy: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'renamed-user-data-'))
  current = join(directory, 'coding-data.json')
  legacy = join(directory, 'orca-data.json')
})

afterEach(() => removeTreeSync(directory))

describe('resolveLegacyRenamedFile', () => {
  it('uses the new file when only it exists', () => {
    writeFileSync(current, '{"current":true}')
    expect(resolveLegacyRenamedFile(current, legacy)).toBe(current)
    expect(readFileSync(current, 'utf8')).toBe('{"current":true}')
  })

  it('copies legacy bytes and keeps the legacy file', () => {
    writeFileSync(legacy, Buffer.from([123, 32, 125, 13, 10]))
    expect(resolveLegacyRenamedFile(current, legacy)).toBe(current)
    expect([...readFileSync(current)]).toEqual([123, 32, 125, 13, 10])
    expect([...readFileSync(legacy)]).toEqual([123, 32, 125, 13, 10])
    expect(readdirSync(directory).sort()).toEqual(['coding-data.json', 'orca-data.json'])
  })

  it('returns the new write destination without creating an empty file', () => {
    expect(resolveLegacyRenamedFile(current, legacy)).toBe(current)
    expect(readdirSync(directory)).toEqual([])
  })

  it('keeps new content when both files exist', () => {
    writeFileSync(current, '{"current":true}')
    writeFileSync(legacy, '{"legacy":true}')
    expect(resolveLegacyRenamedFile(current, legacy)).toBe(current)
    expect(readFileSync(current, 'utf8')).toBe('{"current":true}')
    expect(readFileSync(legacy, 'utf8')).toBe('{"legacy":true}')
  })

  it('migrates numbered backups even when the primary is missing', () => {
    writeFileSync(`${legacy}.bak.0`, '{"backup":true}')
    writeFileSync(`${legacy}.bak.6`, '{"older":true}')
    expect(renamedUserDataFile(legacy)).toBe(current)
    expect(readFileSync(`${current}.bak.0`, 'utf8')).toBe('{"backup":true}')
    expect(readFileSync(`${current}.bak.6`, 'utf8')).toBe('{"older":true}')
    expect(readFileSync(`${legacy}.bak.0`, 'utf8')).toBe('{"backup":true}')
  })
})
