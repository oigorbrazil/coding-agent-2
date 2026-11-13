import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { GlobalSettings } from '../../shared/global-settings-types'

/** The Coding Opus runner reads every file matching this prefix (orchestrate.py `linked_accounts`). */
export const CODING_OPUS_LINKED_ACCOUNTS_PREFIX = 'coding-agent-accounts'

const ACCOUNT_SETTING_KEYS = [
  'codexManagedAccounts',
  'activeCodexManagedAccountId',
  'claudeManagedAccounts',
  'activeClaudeManagedAccountId'
] as const satisfies readonly (keyof GlobalSettings)[]

type AccountSettings = Pick<GlobalSettings, (typeof ACCOUNT_SETTING_KEYS)[number]>

export type CodingOpusLinkedAccount = {
  id: string
  email: string
  label: string | null
  /** The folder the CLI runs with: CODEX_HOME for Codex, CLAUDE_CONFIG_DIR for Claude. */
  home: string
}

export type CodingOpusLinkedAccounts = {
  version: 1
  source: string
  updatedAt: string
  active: { codex: string | null; claude: string | null }
  providers: { codex: CodingOpusLinkedAccount[]; claude: CodingOpusLinkedAccount[] }
}

/** Host accounts only: a WSL account's home is not a path the Windows runner can hand to a CLI. */
export function codingOpusLinkedAccounts(
  settings: AccountSettings,
  userDataPath: string,
  now: Date = new Date()
): CodingOpusLinkedAccounts {
  return {
    version: 1,
    source: userDataPath,
    updatedAt: now.toISOString(),
    active: {
      codex: settings.activeCodexManagedAccountId ?? null,
      claude: settings.activeClaudeManagedAccountId ?? null
    },
    providers: {
      codex: (settings.codexManagedAccounts ?? [])
        .filter((account) => (account.managedHomeRuntime ?? 'host') === 'host')
        .map((account) => ({
          id: account.id,
          email: account.email,
          label: account.workspaceLabel ?? null,
          home: account.managedHomePath
        })),
      claude: (settings.claudeManagedAccounts ?? [])
        .filter((account) => (account.managedAuthRuntime ?? 'host') === 'host')
        .map((account) => ({
          id: account.id,
          email: account.email,
          label: account.organizationName ?? null,
          // Same folder ClaudeProfileRouter routes CLAUDE_CONFIG_DIR to for this account.
          home: join(userDataPath, 'claude-profiles', account.id, 'home')
        }))
    }
  }
}

/** One file per app data folder, so a dev build and an installed build never overwrite each other. */
export function codingOpusLinkedAccountsFile(stateDir: string, userDataPath: string): string {
  const instance = basename(userDataPath).replace(/[^A-Za-z0-9_-]+/g, '-') || 'app'
  return join(stateDir, `${CODING_OPUS_LINKED_ACCOUNTS_PREFIX}.${instance}.json`)
}

function withoutStamp(payload: CodingOpusLinkedAccounts): string {
  return JSON.stringify({ ...payload, updatedAt: null })
}

/** Returns whether it wrote; an unchanged account list keeps the file and its stamp. */
export function writeCodingOpusLinkedAccounts(
  path: string,
  payload: CodingOpusLinkedAccounts
): boolean {
  try {
    const previous: CodingOpusLinkedAccounts = JSON.parse(readFileSync(path, 'utf8'))
    if (withoutStamp(previous) === withoutStamp(payload)) {
      return false
    }
  } catch {
    // Missing or unreadable: write a fresh copy.
  }
  const temporary = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8' })
    renameSync(temporary, path)
  } finally {
    rmSync(temporary, { force: true })
  }
  return true
}

/**
 * Publishes the managed Codex and Claude accounts for the Coding Opus runner, which moves a worker
 * to another account when one hits its usage limit. Only paths and emails are written, never
 * credentials. Nothing is written until Coding Opus has created its state folder.
 */
export function startCodingOpusAccountsExport(args: {
  getSettings: () => AccountSettings
  onSettingsChanged: (listener: (updates: Partial<GlobalSettings>) => void) => unknown
  userDataPath: string
  stateDir: string
  log?: (message: string) => void
}): void {
  const path = codingOpusLinkedAccountsFile(args.stateDir, args.userDataPath)
  const publish = (): void => {
    if (!existsSync(args.stateDir)) {
      return
    }
    try {
      mkdirSync(args.stateDir, { recursive: true })
      writeCodingOpusLinkedAccounts(
        path,
        codingOpusLinkedAccounts(args.getSettings(), args.userDataPath)
      )
    } catch (error) {
      args.log?.(`[coding-opus] could not publish accounts: ${String(error)}`)
    }
  }
  publish()
  args.onSettingsChanged((updates) => {
    if (ACCOUNT_SETTING_KEYS.some((key) => key in updates)) {
      publish()
    }
  })
}
