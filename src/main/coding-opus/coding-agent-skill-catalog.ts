import { cp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type {
  CodingOpusSkillTarget,
  SkillCatalogEntry,
  SkillCatalogInstall,
  SkillCatalogScope,
  SkillCatalogStatus
} from '../../shared/coding-opus'
import { BUNDLED_SKILL_SOURCES } from '../skills/bundled-skill-install/bundled-skill-sources'
import {
  CODING_OPUS_SKILL_NAME,
  codingOpusBundledSkillDir,
  codingOpusSkillRoots
} from './coding-opus-paths'
import {
  SKILL_SIDECAR_FILE,
  exists,
  installCodingOpusInto,
  parseSkillVersion,
  readBundleSource,
  swapSkillFolder
} from './coding-opus-skill-install'
import {
  importSkillFolder,
  listLibrarySkills,
  removeLibrarySkill
} from './coding-agent-skill-library'

const TARGETS: readonly CodingOpusSkillTarget[] = ['claude', 'codex']
// Bundled app skills that still fit Coding Agent 2; the rest drive features it dropped.
const OFFERED_APP_SKILLS = new Set(['orca-cli', 'orca-per-workspace-env'])
// Installed under its own name so it never lands in, or replaces, an installed Orca's skill folder.
const APP_SKILL_PREFIX = 'ca2-'

function appSkillName(sourceName: string): string {
  return APP_SKILL_PREFIX + sourceName.replace(/^orca-/, '')
}

/** The bundled SKILL.md with its frontmatter name switched to the ca2- folder name. */
function appSkillMarkdown(text: string, name: string): string {
  return text.replace(/^name:.*$/m, `name: ${name}`)
}

function frontmatterDescription(markdown: string): string {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)?.[1] ?? ''
  const folded = /^description:\s*>-?\s*\r?\n((?:\s{2,}.*\r?\n?)+)/m.exec(front)
  if (folded) {
    return folded[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ')
  }
  return /^description:\s*["']?(.*?)["']?\s*$/m.exec(front)?.[1]?.trim() ?? ''
}

async function catalog(): Promise<SkillCatalogEntry[]> {
  const codingMarkdown = await readFile(join(codingOpusBundledSkillDir(), 'SKILL.md'), 'utf8')
  const source = await readBundleSource()
  const entries: SkillCatalogEntry[] = [
    {
      name: CODING_OPUS_SKILL_NAME,
      title: 'Coding Opus',
      description: frontmatterDescription(codingMarkdown),
      version: String(source.version),
      origin: 'coding-opus'
    }
  ]
  for (const skill of BUNDLED_SKILL_SOURCES) {
    if (OFFERED_APP_SKILLS.has(skill.name)) {
      entries.push({
        name: appSkillName(skill.name),
        title: appSkillName(skill.name),
        description: frontmatterDescription(skill.text),
        version: parseSkillVersion(skill.text),
        origin: 'app'
      })
    }
  }
  for (const skill of await listLibrarySkills()) {
    entries.push({
      name: skill.name,
      title: skill.name,
      description: frontmatterDescription(skill.markdown),
      version: parseSkillVersion(skill.markdown),
      origin: 'library'
    })
  }
  return entries
}

/** Built-in names a loaded skill may not take, so it can never replace one the app ships. */
function builtInNames(): Set<string> {
  const names = new Set([CODING_OPUS_SKILL_NAME])
  for (const skill of BUNDLED_SKILL_SOURCES) {
    names.add(skill.name)
    names.add(appSkillName(skill.name))
  }
  return names
}

export async function loadSkillIntoLibrary(sourceDir: string): Promise<string> {
  return importSkillFolder(sourceDir, builtInNames())
}

export async function forgetLibrarySkill(name: string): Promise<void> {
  const entry = (await catalog()).find((candidate) => candidate.name === name)
  if (entry?.origin !== 'library') {
    throw new Error(`not-a-loaded-skill:${name}`)
  }
  await removeLibrarySkill(name)
}

/** Claude Code reads `.claude/skills`; Codex reads `.agents/skills`, globally or inside a project. */
async function rootsFor(scope: SkillCatalogScope): Promise<Record<CodingOpusSkillTarget, string>> {
  if (scope.kind === 'global') {
    return codingOpusSkillRoots()
  }
  if (!isAbsolute(scope.projectPath)) {
    throw new Error('project-path-not-absolute')
  }
  const info = await stat(scope.projectPath).catch(() => null)
  if (!info?.isDirectory()) {
    throw new Error('project-path-missing')
  }
  return {
    claude: join(scope.projectPath, '.claude', 'skills'),
    codex: join(scope.projectPath, '.agents', 'skills')
  }
}

async function installState(dir: string): Promise<SkillCatalogInstall['state']> {
  if (!(await exists(join(dir, 'SKILL.md')))) {
    return 'missing'
  }
  return (await exists(join(dir, SKILL_SIDECAR_FILE))) ? 'managed' : 'external'
}

export async function getSkillCatalogStatus(scope: SkillCatalogScope): Promise<SkillCatalogStatus> {
  const [entries, roots] = await Promise.all([catalog(), rootsFor(scope)])
  const installs: SkillCatalogInstall[] = []
  for (const entry of entries) {
    for (const target of TARGETS) {
      const dir = join(roots[target], entry.name)
      let version: string | null = null
      try {
        version = parseSkillVersion(await readFile(join(dir, 'SKILL.md'), 'utf8'))
      } catch {
        version = null
      }
      installs.push({
        name: entry.name,
        target,
        path: dir,
        state: await installState(dir),
        version
      })
    }
  }
  return { scope, entries, installs }
}

function assertKnown(entries: SkillCatalogEntry[], name: string): SkillCatalogEntry {
  const entry = entries.find((candidate) => candidate.name === name)
  if (!entry) {
    throw new Error(`unknown-skill:${name}`)
  }
  return entry
}

export async function installCatalogSkill(
  name: string,
  targets: readonly CodingOpusSkillTarget[],
  scope: SkillCatalogScope
): Promise<SkillCatalogStatus> {
  const entries = await catalog()
  const entry = assertKnown(entries, name)
  const roots = await rootsFor(scope)
  for (const target of targets) {
    if (entry.origin === 'coding-opus') {
      await installCodingOpusInto(roots[target])
      continue
    }
    if (entry.origin === 'library') {
      const library = (await listLibrarySkills()).find((skill) => skill.name === name)
      if (!library) {
        throw new Error(`unknown-skill:${name}`)
      }
      await swapSkillFolder(
        roots[target],
        name,
        (staging) => cp(library.dir, staging, { recursive: true }),
        { version: entry.version, source: 'library' }
      )
      continue
    }
    const source = BUNDLED_SKILL_SOURCES.find((skill) => appSkillName(skill.name) === name)
    if (!source) {
      throw new Error(`unknown-skill:${name}`)
    }
    await swapSkillFolder(
      roots[target],
      name,
      (staging) => writeFile(join(staging, 'SKILL.md'), appSkillMarkdown(source.text, name)),
      { version: entry.version }
    )
  }
  return getSkillCatalogStatus(scope)
}

/** Removes only copies this app installed; a hand-made skill of the same name stays put. */
export async function removeCatalogSkill(
  name: string,
  targets: readonly CodingOpusSkillTarget[],
  scope: SkillCatalogScope
): Promise<SkillCatalogStatus> {
  assertKnown(await catalog(), name)
  const roots = await rootsFor(scope)
  for (const target of targets) {
    const dir = join(roots[target], name)
    if ((await installState(dir)) === 'managed') {
      await rm(dir, { recursive: true, force: true })
    }
  }
  return getSkillCatalogStatus(scope)
}
