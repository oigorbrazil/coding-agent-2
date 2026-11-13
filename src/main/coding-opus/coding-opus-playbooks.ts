import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse } from 'yaml'
import type { CodingOpusPlaybooks, CodingOpusPlaybooksSaveResult } from '../../shared/coding-opus'
import { codingOpusBundledSkillDir, codingOpusPlaybooksPath } from './coding-opus-paths'

const MAX_PLAYBOOKS_BYTES = 1 << 20
const PLAYBOOKS_FILE = 'coding-opus-playbooks.yaml'

/**
 * Every copy of the playbooks file the skill may be reading. The Claude desktop app runs agents in
 * an MSIX package whose %APPDATA% writes land in `Packages\Claude_*\LocalCache\Roaming`, so the
 * skill inside it and this app outside it would otherwise keep two different files.
 */
async function playbooksCopies(): Promise<string[]> {
  const primary = codingOpusPlaybooksPath()
  const copies = [primary]
  const localAppData = process.env.LOCALAPPDATA
  const appData = process.env.APPDATA
  if (
    process.platform !== 'win32' ||
    process.env.CODING_OPUS_PLAYBOOKS?.trim() ||
    !localAppData ||
    // Only the legacy %APPDATA% location is split; the runner now keeps its state in the home folder.
    !appData ||
    dirname(primary).toLowerCase() !== join(appData, 'CodingOpus').toLowerCase()
  ) {
    return copies
  }
  const packages = join(localAppData, 'Packages')
  const entries = await readdir(packages, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^Claude_/i.test(entry.name)) {
      continue
    }
    const folder = join(packages, entry.name, 'LocalCache', 'Roaming', 'CodingOpus')
    // Only a package whose skill already keeps state there gets a mirrored copy.
    if ((await stat(folder).catch(() => null))?.isDirectory()) {
      copies.push(join(folder, PLAYBOOKS_FILE))
    }
  }
  return copies
}

type CopyState = { path: string; text: string; mtimeMs: number }

async function readCopies(): Promise<CopyState[]> {
  const states: CopyState[] = []
  for (const path of await playbooksCopies()) {
    try {
      const [text, info] = await Promise.all([readFile(path, 'utf8'), stat(path)])
      states.push({ path, text, mtimeMs: info.mtimeMs })
    } catch {
      // Missing copy: it is created on the next save or sync.
    }
  }
  return states
}

async function writeAtomic(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  try {
    const current = await readFile(path, 'utf8')
    if (current !== text) {
      await writeFile(`${path}.bak`, current)
    }
  } catch {
    // Nothing saved yet: no backup to keep.
  }
  const staging = `${path}.tmp`
  try {
    await writeFile(staging, text)
    await rename(staging, path)
  } catch (error) {
    await rm(staging, { force: true })
    throw error
  }
}

/** Newest modification time across every copy; the editor polls it to pick up outside edits. */
export async function codingOpusPlaybooksStamp(): Promise<number> {
  return Math.max(0, ...(await readCopies()).map((copy) => copy.mtimeMs))
}

/**
 * The newest copy wins and is mirrored to the others, so an edit made by the skill (or an agent)
 * in either location shows up here and in every other copy. Falls back to the bundled file.
 */
export async function readCodingOpusPlaybooks(): Promise<CodingOpusPlaybooks> {
  const path = codingOpusPlaybooksPath()
  const copies = await readCopies()
  const backupText = await readFile(`${path}.bak`, 'utf8').catch(() => null)
  const newest = copies.toSorted((a, b) => b.mtimeMs - a.mtimeMs)[0]
  if (!newest) {
    const text = await readFile(join(codingOpusBundledSkillDir(), 'playbooks.yaml'), 'utf8')
    return { text, path, custom: false, backupText }
  }
  if (validatePlaybooksText(newest.text) === null) {
    const all = await playbooksCopies()
    for (const target of all) {
      const existing = copies.find((copy) => copy.path === target)
      if (existing?.text !== newest.text) {
        await writeAtomic(target, newest.text).catch(() => undefined)
      }
    }
  }
  return {
    text: newest.text,
    path,
    custom: true,
    backupText: await readFile(`${path}.bak`, 'utf8').catch(() => backupText)
  }
}

/** orchestrate.py loads a mapping with `version`, `tiers` and `profiles`; refuse anything it would choke on. */
export function validatePlaybooksText(text: string): string | null {
  if (!text.trim()) {
    return 'empty'
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_PLAYBOOKS_BYTES) {
    return 'too-large'
  }
  let doc: unknown
  try {
    doc = parse(text)
  } catch (error) {
    return `yaml: ${error instanceof Error ? error.message : String(error)}`
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return 'root-not-mapping'
  }
  const root = doc as Record<string, unknown>
  if (root.version === undefined) {
    return 'missing-version'
  }
  for (const key of ['tiers', 'profiles'] as const) {
    const value = root[key]
    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
      return `${key}-not-mapping`
    }
  }
  return null
}

/** Atomic write (tmp → rename) to every copy, each keeping a one-step backup the skill ignores. */
export async function saveCodingOpusPlaybooks(
  text: string
): Promise<CodingOpusPlaybooksSaveResult> {
  const invalid = validatePlaybooksText(text)
  if (invalid) {
    return { ok: false, error: invalid }
  }
  try {
    for (const path of await playbooksCopies()) {
      await writeAtomic(path, text)
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  return { ok: true, playbooks: await readCodingOpusPlaybooks() }
}
