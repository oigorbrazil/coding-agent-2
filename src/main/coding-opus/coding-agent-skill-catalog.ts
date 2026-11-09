import { readFile, rm, stat, writeFile } from 'node:fs/promises'
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

const TARGETS: readonly CodingOpusSkillTarget[] = ['claude', 'codex']
// Bundled app skills that still fit Coding Agent 2; the rest drive features it dropped.
const OFFERED_APP_SKILLS = new Set(['orchestration', 'orca-cli', 'orca-per-workspace-env'])

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
        name: skill.name,
        title: skill.name,
        description: frontmatterDescription(skill.text),
        version: parseSkillVersion(skill.text),
        origin: 'app'
      })
    }
  }
  return entries
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
    const source = BUNDLED_SKILL_SOURCES.find((skill) => skill.name === name)
    if (!source) {
      throw new Error(`unknown-skill:${name}`)
    }
    await swapSkillFolder(
      roots[target],
      name,
      (staging) => writeFile(join(staging, 'SKILL.md'), source.text),
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
