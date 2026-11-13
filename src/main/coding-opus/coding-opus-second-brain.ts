import { runProcess } from '@coding-agent/process-host'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { parse } from 'yaml'
import type {
  CodingOpusCommandResult,
  SecondBrainFindHit,
  SecondBrainFolder,
  SecondBrainNote,
  SecondBrainNoteSummary,
  SecondBrainOverview,
  SecondBrainRecordRequest,
  SecondBrainWhere
} from '../../shared/coding-opus'
import { codingOpusBundledSkillDir } from './coding-opus-paths'

// brain.py's SKIP_DIRS: the app lists the same notes the skill searches.
const SKIP_DIRS = new Set([
  '.obsidian',
  '.git',
  '.trash',
  'node_modules',
  '.venv',
  '__pycache__',
  '99-Templates'
])
const MAX_DEPTH = 6
const RECENT_LIMIT = 30
const BRAIN_TIMEOUT_MS = 20_000
const NOTE_TYPES = new Set(['nota', 'decisao', 'estudo', 'ideia', 'meeting'])

type PythonCommand = { file: string; prefix: string[] }
let cachedPython: PythonCommand | null = null

function pythonCandidates(): PythonCommand[] {
  const fromEnv = process.env.CODING_OPUS_PYTHON?.trim()
  const list: PythonCommand[] = fromEnv ? [{ file: fromEnv, prefix: [] }] : []
  if (process.platform === 'win32') {
    list.push({ file: 'py', prefix: ['-3'] }, { file: 'python', prefix: [] })
  } else {
    list.push({ file: 'python3', prefix: [] }, { file: 'python', prefix: [] })
  }
  return list
}

// A missing interpreter rejects (ENOENT), so the caller can try the next one.
async function run(
  command: PythonCommand,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  const result = await runProcess({
    program: command.file,
    args: [...command.prefix, ...args],
    timeoutMs: BRAIN_TIMEOUT_MS,
    maxOutputBytes: 8 * 1024 * 1024,
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
  })
  return { code: result.code ?? 1, stdout: result.stdout, stderr: result.stderr }
}

/** Runs the skill's own `scripts/brain.py`, the single owner of the second brain rules. */
async function runBrain(args: string[]): Promise<CodingOpusCommandResult<string>> {
  const script = join(codingOpusBundledSkillDir(), 'scripts', 'brain.py')
  const candidates = cachedPython ? [cachedPython] : pythonCandidates()
  for (const candidate of candidates) {
    try {
      const result = await run(candidate, [script, ...args])
      cachedPython = candidate
      if (result.code !== 0) {
        return {
          ok: false,
          error: (result.stderr || result.stdout).trim() || `brain.py exited ${result.code}`
        }
      }
      return { ok: true, value: result.stdout }
    } catch {
      // Interpreter missing: try the next one.
    }
  }
  return { ok: false, error: 'python-not-found' }
}

async function brainWhere(): Promise<CodingOpusCommandResult<SecondBrainWhere>> {
  const result = await runBrain(['where'])
  if (!result.ok) {
    return result
  }
  try {
    const parsed = JSON.parse(result.value) as Partial<SecondBrainWhere>
    return {
      ok: true,
      value: {
        secondBrain: String(parsed.secondBrain ?? ''),
        exists: Boolean(parsed.exists),
        documents: parsed.documents ? String(parsed.documents) : null
      }
    }
  } catch {
    return { ok: false, error: 'brain.py where returned unexpected output' }
  }
}

function frontmatterOf(text: string): Record<string, unknown> {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
  if (!front) {
    return {}
  }
  try {
    const parsed = parse(front) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
}

async function collectNotes(
  root: string,
  dir: string,
  depth: number,
  out: string[]
): Promise<void> {
  if (depth > MAX_DEPTH) {
    return
  }
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        await collectNotes(root, join(dir, entry.name), depth + 1, out)
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(join(dir, entry.name))
    }
  }
}

function toRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

async function summarize(root: string, path: string): Promise<SecondBrainNoteSummary> {
  const [text, info] = await Promise.all([readFile(path, 'utf8'), stat(path)])
  const front = frontmatterOf(text)
  const rel = toRelative(root, path)
  const fallbackTitle = rel.split('/').pop()?.replace(/\.md$/i, '') ?? rel
  const tags = Array.isArray(front.tags) ? front.tags.map(String) : []
  return {
    path: rel,
    title: asText(front.title) ?? fallbackTitle,
    type: asText(front.type),
    status: asText(front.status),
    tags,
    updated: asText(front.updated),
    modifiedMs: info.mtimeMs
  }
}

export async function getSecondBrainOverview(): Promise<
  CodingOpusCommandResult<SecondBrainOverview>
> {
  const where = await brainWhere()
  if (!where.ok) {
    return where
  }
  if (!where.value.exists) {
    return { ok: true, value: { where: where.value, folders: [], recent: [], totalNotes: 0 } }
  }
  const root = where.value.secondBrain
  const files: string[] = []
  await collectNotes(root, root, 0, files)
  const folderCounts = new Map<string, number>()
  for (const file of files) {
    const top = toRelative(root, file).split('/')
    const name = top.length > 1 ? top[0] : '.'
    folderCounts.set(name, (folderCounts.get(name) ?? 0) + 1)
  }
  const topEntries = await readdir(root, { withFileTypes: true }).catch(() => [])
  for (const entry of topEntries) {
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
      folderCounts.set(entry.name, folderCounts.get(entry.name) ?? 0)
    }
  }
  const folders: SecondBrainFolder[] = [...folderCounts.entries()]
    .map(([name, notes]) => ({ name, notes }))
    .toSorted((a, b) => a.name.localeCompare(b.name))
  const summaries = await Promise.all(files.map((file) => summarize(root, file).catch(() => null)))
  const recent = summaries
    .filter((entry): entry is SecondBrainNoteSummary => entry !== null)
    .toSorted((a, b) => b.modifiedMs - a.modifiedMs)
    .slice(0, RECENT_LIMIT)
  return { ok: true, value: { where: where.value, folders, recent, totalNotes: files.length } }
}

export async function findSecondBrainNotes(
  query: string,
  route: string | null
): Promise<CodingOpusCommandResult<SecondBrainFindHit[]>> {
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 12)
  if (terms.length === 0) {
    return { ok: true, value: [] }
  }
  const args = ['find', ...terms, '--json', '--limit', '25']
  if (route) {
    args.push('--route', route)
  }
  const result = await runBrain(args)
  if (!result.ok) {
    return result
  }
  try {
    const parsed = JSON.parse(result.value) as { notes?: Record<string, unknown>[] }
    return {
      ok: true,
      value: (parsed.notes ?? []).map((note) => ({
        path: String(note.path ?? ''),
        title: String(note.title ?? note.path ?? ''),
        type: asText(note.type),
        status: asText(note.status),
        updated: asText(note.updated),
        tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
        match: asText(note.match)
      }))
    }
  } catch {
    return { ok: false, error: 'brain.py find returned unexpected output' }
  }
}

/** Reads one note, refusing paths that escape the second brain. */
export async function readSecondBrainNote(
  relativePath: string
): Promise<CodingOpusCommandResult<SecondBrainNote>> {
  const where = await brainWhere()
  if (!where.ok) {
    return where
  }
  const root = resolve(where.value.secondBrain)
  const target = resolve(root, relativePath)
  if (!target.startsWith(root + sep) || !target.toLowerCase().endsWith('.md')) {
    return { ok: false, error: 'outside-second-brain' }
  }
  try {
    return {
      ok: true,
      value: { path: toRelative(root, target), text: await readFile(target, 'utf8') }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function recordSecondBrainNote(
  request: SecondBrainRecordRequest
): Promise<CodingOpusCommandResult<string>> {
  const title = request.title.trim()
  if (!title) {
    return { ok: false, error: 'title-required' }
  }
  if (!NOTE_TYPES.has(request.type)) {
    return { ok: false, error: 'invalid-type' }
  }
  const args = ['record', '--write', '--no-report', '--title', title, '--type', request.type]
  args.push('--folder', request.folder.trim() || '00-Inbox')
  if (request.summary.trim()) {
    args.push('--summary', request.summary.trim())
  }
  for (const tag of request.tags.map((entry) => entry.trim()).filter(Boolean)) {
    args.push('--tag', tag)
  }
  const result = await runBrain(args)
  return result.ok ? { ok: true, value: result.value.trim() } : result
}

/** `brain.py install`: creates the second brain if missing and writes the global rules. */
export async function installSecondBrain(): Promise<CodingOpusCommandResult<string>> {
  const result = await runBrain(['install'])
  return result.ok ? { ok: true, value: result.value.trim() } : result
}
