import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { isDefinitiveAbsence } from '../../../shared/definitive-filesystem-absence'
import { isPlainObject, parseHooksJsonText } from '../../agent-hooks/hooks-json-read'
import { writeHooksJsonAsync } from '../../agent-hooks/hooks-json-write-async'
import { withManagedHookInstallLock } from '../../agent-hooks/managed-hook-install-lock'

/** What Coding Agent 2 replaced in one config dir's settings.json, so turning the sync off can put it back. */
export type ClaudeThemeOwnership = {
  /** The Coding Agent 2 profile (userData path) that took over; only it restores, so builds with different settings do not fight. */
  owner: string
  /** null when settings.json had no theme. */
  previousTheme: string | null
  /** The user picked another theme after Coding Agent 2's; Coding Agent 2 stops writing it. */
  userChangedTheme?: true
}

type OwnershipByConfigDir = Map<string, ClaudeThemeOwnership>

// Why under ~/.orca, not userData: every Coding Agent 2 build on this machine must agree on what it replaced.
function ownershipPath(): string {
  return join(homedir(), '.coding-agent-2', 'claude-theme-sync.json')
}

/** Every config dir Coding Agent 2 took over, keyed by path; null when the record exists but cannot be read. */
export async function readClaudeThemeOwnership(): Promise<OwnershipByConfigDir | null> {
  let raw: string
  try {
    raw = await readFile(ownershipPath(), 'utf-8')
  } catch (error) {
    return isDefinitiveAbsence(error) ? new Map() : null
  }
  const parsed = parseHooksJsonText(raw)
  if (!parsed) {
    return null
  }
  const owned: OwnershipByConfigDir = new Map()
  for (const [dir, entry] of Object.entries(parsed)) {
    const previous = isPlainObject(entry) ? entry.previousTheme : undefined
    if (
      isPlainObject(entry) &&
      typeof entry.owner === 'string' &&
      (typeof previous === 'string' || previous === null)
    ) {
      owned.set(dir, {
        owner: entry.owner,
        previousTheme: previous,
        ...(entry.userChangedTheme === true ? { userChangedTheme: true } : {})
      })
    }
  }
  return owned
}

/** One config dir's record, read and written under Coding Agent 2's managed-hook lock. */
export type ClaudeThemeOwnershipSlot = {
  entry: ClaudeThemeOwnership | undefined
  /** Saves `next` (undefined removes it) before the caller goes on. */
  save: (next: ClaudeThemeOwnership | undefined) => Promise<void>
}

/**
 * Runs `edit` with a fresh read of `configDir`'s record under Coding Agent 2's cross-process managed-hook lock,
 * so two Coding Agent 2 builds never drop each other's entries or edit settings.json for the theme at once.
 */
export async function withClaudeThemeOwnership<T>(
  configDir: string,
  edit: (slot: ClaudeThemeOwnershipSlot) => Promise<T>
): Promise<T> {
  return await withManagedHookInstallLock(homedir(), undefined, async () => {
    const owned = await readClaudeThemeOwnership()
    if (!owned) {
      throw new Error(`Cannot read ${ownershipPath()}`)
    }
    return await edit({
      entry: owned.get(configDir),
      save: async (next) => {
        if (next) {
          owned.set(configDir, next)
        } else if (!owned.delete(configDir)) {
          return
        }
        await writeHooksJsonAsync(ownershipPath(), Object.fromEntries(owned))
      }
    })
  })
}

/** Holds the same lock as record edits, so a reload retry never republishes a file another Coding Agent 2 just replaced. */
export async function withClaudeThemeFileLock<T>(run: () => Promise<T>): Promise<T> {
  return await withManagedHookInstallLock(homedir(), undefined, run)
}
