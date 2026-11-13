import { mkdtempSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { GlobalSettings } from '../../shared/global-settings-types'
import {
  codingOpusLinkedAccounts,
  codingOpusLinkedAccountsFile,
  startCodingOpusAccountsExport,
  writeCodingOpusLinkedAccounts
} from './coding-opus-accounts-export'

const created = 1_700_000_000_000
const settings = {
  codexManagedAccounts: [
    {
      id: 'codex-1',
      email: 'me@work.example',
      managedHomePath: '/data/codex-accounts/codex-1/home',
      workspaceLabel: 'Work',
      createdAt: created,
      updatedAt: created,
      lastAuthenticatedAt: created
    },
    {
      id: 'codex-wsl',
      email: 'me@wsl.example',
      managedHomePath: '/data/codex-accounts/codex-wsl/home',
      managedHomeRuntime: 'wsl' as const,
      createdAt: created,
      updatedAt: created,
      lastAuthenticatedAt: created
    }
  ],
  activeCodexManagedAccountId: 'codex-1',
  claudeManagedAccounts: [
    {
      id: 'claude-1',
      email: 'me@home.example',
      managedAuthPath: '/data/claude-accounts/claude-1',
      authMethod: 'subscription-oauth' as const,
      createdAt: created,
      updatedAt: created,
      lastAuthenticatedAt: created
    }
  ],
  activeClaudeManagedAccountId: null
} satisfies Pick<
  GlobalSettings,
  | 'codexManagedAccounts'
  | 'activeCodexManagedAccountId'
  | 'claudeManagedAccounts'
  | 'activeClaudeManagedAccountId'
>

const folders: string[] = []
function folder(): string {
  const path = mkdtempSync(join(tmpdir(), 'coding-opus-accounts-'))
  folders.push(path)
  return path
}

afterEach(() => {
  for (const path of folders.splice(0)) {
    rmSync(path, { recursive: true, force: true })
  }
})

describe('codingOpusLinkedAccounts', () => {
  it('publishes host account homes and the active ids, without WSL accounts or credentials', () => {
    const payload = codingOpusLinkedAccounts(settings, '/data', new Date('2026-11-11T00:00:00Z'))
    expect(payload.providers.codex).toEqual([
      {
        id: 'codex-1',
        email: 'me@work.example',
        label: 'Work',
        home: '/data/codex-accounts/codex-1/home'
      }
    ])
    expect(payload.providers.claude).toEqual([
      {
        id: 'claude-1',
        email: 'me@home.example',
        label: null,
        home: join('/data', 'claude-profiles', 'claude-1', 'home')
      }
    ])
    expect(payload.active).toEqual({ codex: 'codex-1', claude: null })
    expect(JSON.stringify(payload)).not.toContain('managedAuthPath')
  })

  it('names the file after the app data folder', () => {
    expect(codingOpusLinkedAccountsFile('/state', '/roaming/coding-agent-2-orca-dev')).toBe(
      join('/state', 'coding-agent-accounts.coding-agent-2-orca-dev.json')
    )
  })
})

describe('writeCodingOpusLinkedAccounts', () => {
  it('keeps the file when only the stamp would change', () => {
    const path = join(folder(), 'accounts.json')
    expect(
      writeCodingOpusLinkedAccounts(path, codingOpusLinkedAccounts(settings, '/data', new Date(1)))
    ).toBe(true)
    expect(
      writeCodingOpusLinkedAccounts(path, codingOpusLinkedAccounts(settings, '/data', new Date(2)))
    ).toBe(false)
    const changed = { ...settings, activeCodexManagedAccountId: null }
    expect(
      writeCodingOpusLinkedAccounts(path, codingOpusLinkedAccounts(changed, '/data', new Date(3)))
    ).toBe(true)
    expect(JSON.parse(readFileSync(path, 'utf8')).active.codex).toBeNull()
  })
})

describe('startCodingOpusAccountsExport', () => {
  it('writes only once Coding Opus has a state folder, then again when accounts change', () => {
    const root = folder()
    const stateDir = join(root, 'CodingOpus')
    let current = settings
    const listeners: ((updates: Partial<GlobalSettings>) => void)[] = []
    const start = (): void =>
      startCodingOpusAccountsExport({
        getSettings: () => current,
        onSettingsChanged: (listener) => listeners.push(listener),
        userDataPath: join(root, 'coding-agent-2'),
        stateDir
      })
    start()
    expect(existsSync(stateDir)).toBe(false)

    mkdirSync(stateDir)
    start()
    const path = codingOpusLinkedAccountsFile(stateDir, join(root, 'coding-agent-2'))
    expect(JSON.parse(readFileSync(path, 'utf8')).providers.codex).toHaveLength(1)

    current = { ...settings, codexManagedAccounts: [] }
    const themeOnly: Partial<GlobalSettings> = { theme: 'dark' }
    for (const listener of listeners) {
      listener(themeOnly)
    }
    expect(JSON.parse(readFileSync(path, 'utf8')).providers.codex).toHaveLength(1)
    for (const listener of listeners) {
      listener({ codexManagedAccounts: [] })
    }
    expect(JSON.parse(readFileSync(path, 'utf8')).providers.codex).toHaveLength(0)
  })
})
