import { cp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app } from 'electron'

/** Skills the person loaded from disk; Settings → Skills installs them like the bundled ones. */
export function skillLibraryRoot(): string {
  return join(app.getPath('userData'), 'skill-library')
}

const SKILL_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const MAX_SKILL_BYTES = 50 * 1024 * 1024

export type LibrarySkill = { name: string; dir: string; markdown: string }

export function frontmatterName(markdown: string): string | null {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)?.[1] ?? ''
  return /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(front)?.[1]?.trim() ?? null
}

export async function listLibrarySkills(): Promise<LibrarySkill[]> {
  const root = skillLibraryRoot()
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  const skills: LibrarySkill[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !SKILL_NAME.test(entry.name)) {
      continue
    }
    const dir = join(root, entry.name)
    const markdown = await readFile(join(dir, 'SKILL.md'), 'utf8').catch(() => null)
    if (markdown !== null) {
      skills.push({ name: entry.name, dir, markdown })
    }
  }
  return skills.toSorted((a, b) => a.name.localeCompare(b.name))
}

async function folderBytes(dir: string): Promise<number> {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) {
      total += (await stat(join(entry.parentPath, entry.name))).size
    }
  }
  return total
}

/**
 * Copies a skill folder (one with SKILL.md) into the library. The skill keeps its frontmatter name,
 * or the folder name when it has none; names the app already ships are refused.
 */
export async function importSkillFolder(
  sourceDir: string,
  reservedNames: ReadonlySet<string>
): Promise<string> {
  const markdown = await readFile(join(sourceDir, 'SKILL.md'), 'utf8').catch(() => null)
  if (markdown === null) {
    throw new Error('no-skill-md')
  }
  const name = (frontmatterName(markdown) ?? basename(sourceDir)).toLowerCase()
  if (!SKILL_NAME.test(name)) {
    throw new Error(`invalid-skill-name:${name}`)
  }
  if (reservedNames.has(name)) {
    throw new Error(`reserved-skill-name:${name}`)
  }
  if ((await folderBytes(sourceDir)) > MAX_SKILL_BYTES) {
    throw new Error('skill-too-large')
  }
  const target = join(skillLibraryRoot(), name)
  await rm(target, { recursive: true, force: true })
  await cp(sourceDir, target, {
    recursive: true,
    // Repository metadata and dependencies are never part of a skill.
    filter: (path) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path)
  })
  return name
}

export async function removeLibrarySkill(name: string): Promise<void> {
  if (!SKILL_NAME.test(name)) {
    throw new Error(`invalid-skill-name:${name}`)
  }
  await rm(join(skillLibraryRoot(), name), { recursive: true, force: true })
}
