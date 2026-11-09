import { cp, mkdir, readFile, rename, rm, writeFile, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  CodingOpusSkillStatus,
  CodingOpusSkillTarget,
  CodingOpusSkillTargetStatus
} from '../../shared/coding-opus'
import {
  CODING_OPUS_SKILL_NAME,
  codingOpusBundleRoot,
  codingOpusBundledSkillDir,
  codingOpusSkillRoots
} from './coding-opus-paths'

const SIDECAR_FILE = '.coding-agent-2-skill.json'
const TARGETS: readonly CodingOpusSkillTarget[] = ['claude', 'codex']

type BundleSource = { commit: string; version: number }

export async function readBundleSource(): Promise<BundleSource> {
  const raw = await readFile(join(codingOpusBundleRoot(), 'SOURCE.json'), 'utf8')
  const parsed = JSON.parse(raw) as Partial<BundleSource>
  return { commit: String(parsed.commit ?? ''), version: Number(parsed.version ?? 0) }
}

/** `metadata.version` from SKILL.md frontmatter; the skill quotes it (`version: "30"`). */
export function parseSkillVersion(skillMarkdown: string): string | null {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMarkdown)?.[1]
  if (!front) {
    return null
  }
  const match = /^\s+version:\s*["']?([^"'\s]+)["']?\s*$/m.exec(front)
  return match?.[1] ?? null
}

export async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

async function targetStatus(
  target: CodingOpusSkillTarget,
  root: string
): Promise<CodingOpusSkillTargetStatus> {
  const dir = join(root, CODING_OPUS_SKILL_NAME)
  let installedVersion: string | null = null
  try {
    installedVersion = parseSkillVersion(await readFile(join(dir, 'SKILL.md'), 'utf8'))
  } catch {
    installedVersion = null
  }
  return { target, path: dir, installedVersion, managed: await exists(join(dir, SIDECAR_FILE)) }
}

export async function getCodingOpusSkillStatus(): Promise<CodingOpusSkillStatus> {
  const source = await readBundleSource()
  const roots = codingOpusSkillRoots()
  return {
    bundledVersion: String(source.version),
    bundledCommit: source.commit,
    targets: await Promise.all(TARGETS.map((target) => targetStatus(target, roots[target])))
  }
}

export const SKILL_SIDECAR_FILE = SIDECAR_FILE

/** Stage a full copy beside the target, then swap, so an agent never reads a half-written skill. */
export async function swapSkillFolder(
  root: string,
  name: string,
  fill: (staging: string) => Promise<void>,
  sidecar: Record<string, unknown>
): Promise<void> {
  await mkdir(root, { recursive: true })
  const dir = join(root, name)
  const stamp = `${process.pid}-${Date.now()}`
  const staging = join(root, `.${name}.staging-${stamp}`)
  const previous = join(root, `.${name}.previous-${stamp}`)
  await mkdir(staging, { recursive: true })
  await fill(staging)
  await writeFile(
    join(staging, SIDECAR_FILE),
    `${JSON.stringify({ ...sidecar, installedBy: 'Coding Agent 2' }, null, 2)}\n`
  )
  const hadPrevious = await exists(dir)
  try {
    if (hadPrevious) {
      await rename(dir, previous)
    }
    await rename(staging, dir)
  } catch (error) {
    if (hadPrevious && !(await exists(dir)) && (await exists(previous))) {
      await rename(previous, dir)
    }
    await rm(staging, { recursive: true, force: true })
    throw error
  }
  if (hadPrevious) {
    await rm(previous, { recursive: true, force: true })
  }
}

export async function installCodingOpusInto(root: string): Promise<void> {
  const source = await readBundleSource()
  await swapSkillFolder(
    root,
    CODING_OPUS_SKILL_NAME,
    (staging) => cp(codingOpusBundledSkillDir(), staging, { recursive: true }),
    { version: source.version, commit: source.commit }
  )
}

export async function installCodingOpusSkill(
  targets: readonly CodingOpusSkillTarget[] = TARGETS
): Promise<CodingOpusSkillStatus> {
  const roots = codingOpusSkillRoots()
  for (const target of targets) {
    await installCodingOpusInto(roots[target])
  }
  return getCodingOpusSkillStatus()
}

/** Installs or upgrades on launch; never downgrades a newer copy installed by hand. */
export async function ensureCodingOpusSkillInstalled(): Promise<void> {
  const status = await getCodingOpusSkillStatus()
  const bundled = Number(status.bundledVersion)
  const stale = status.targets
    .filter((entry) => {
      const installed = Number(entry.installedVersion ?? Number.NaN)
      return !Number.isFinite(installed) || installed < bundled
    })
    .map((entry) => entry.target)
  if (stale.length > 0) {
    await installCodingOpusSkill(stale)
  }
}
