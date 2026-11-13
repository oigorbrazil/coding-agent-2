import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { hardenExistingSecureFile } from './secure-storage/secure-file'

/** Publish a byte-preserving copy; retained sources remain available to older builds. */
export function resolveLegacyRenamedFile(
  newPath: string,
  legacyPath: string,
  options?: { copy?: boolean }
): string {
  if (existsSync(newPath) || !existsSync(legacyPath)) {
    return newPath
  }
  if (options?.copy === false) {
    return legacyPath
  }
  mkdirSync(dirname(newPath), { recursive: true })
  const temporary = `${newPath}.${process.pid}.${randomUUID()}.tmp`
  try {
    copyFileSync(legacyPath, temporary)
    hardenExistingSecureFile(temporary)
    // A hard link never replaces an existing file, so a concurrent migration or a write that
    // already landed on the new name wins; no lock library is needed (recovery children run
    // without node_modules).
    linkSync(temporary, newPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  } finally {
    rmSync(temporary, { force: true })
  }
  return newPath
}

export function renamedUserDataFile(legacyPath: string): string {
  legacyPath = join(dirname(legacyPath), basename(legacyPath).replace(/^coding-/, 'orca-'))
  const directory = dirname(legacyPath)
  const name = basename(legacyPath)
  const newPath = join(directory, name.replace(/^orca-/, 'coding-'))
  if ((name === 'orca-data.json' || name === 'orca-profile-index.json') && existsSync(directory)) {
    const backupPattern = name === 'orca-data.json' ? /^\.bak\.\d+$/ : /^\.bak$/
    for (const entry of readdirSync(directory)) {
      if (entry.startsWith(name) && backupPattern.test(entry.slice(name.length))) {
        resolveLegacyRenamedFile(
          join(directory, entry.replace(/^orca-/, 'coding-')),
          join(directory, entry)
        )
      }
    }
  }
  return resolveLegacyRenamedFile(newPath, legacyPath)
}
