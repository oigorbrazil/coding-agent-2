import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse } from 'yaml'
import type { CodingOpusPlaybooks, CodingOpusPlaybooksSaveResult } from '../../shared/coding-opus'
import { codingOpusBundledSkillDir, codingOpusPlaybooksPath } from './coding-opus-paths'

const MAX_PLAYBOOKS_BYTES = 1 << 20

/** The person's copy, or the bundled file until they save one (same rule as Coding Agent 1). */
export async function readCodingOpusPlaybooks(): Promise<CodingOpusPlaybooks> {
  const path = codingOpusPlaybooksPath()
  try {
    return { text: await readFile(path, 'utf8'), path, custom: true }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    const text = await readFile(join(codingOpusBundledSkillDir(), 'playbooks.yaml'), 'utf8')
    return { text, path, custom: false }
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

/** Atomic write (tmp → rename) with a one-step backup the skill ignores. */
export async function saveCodingOpusPlaybooks(
  text: string
): Promise<CodingOpusPlaybooksSaveResult> {
  const invalid = validatePlaybooksText(text)
  if (invalid) {
    return { ok: false, error: invalid }
  }
  const path = codingOpusPlaybooksPath()
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
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  return { ok: true, playbooks: await readCodingOpusPlaybooks() }
}
