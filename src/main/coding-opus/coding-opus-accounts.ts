import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import type {
  CodingOpusAccountProvider,
  CodingOpusAccountRow,
  CodingOpusAccounts,
  CodingOpusAccountsResult
} from '../../shared/coding-opus'
import { CODING_OPUS_LINKED_ACCOUNTS_PREFIX } from './coding-opus-accounts-export'
import { codingOpusPlaybooksPath, codingOpusStateDir } from './coding-opus-paths'

// Mirrors orchestrate.py's account rotation (account_entries, account_rotation, quota_headline) so the
// playbooks editor in this app shows what the runner will do, without needing Python.

const PROVIDERS: readonly CodingOpusAccountProvider[] = ['codex', 'claude']
const DEFAULT_ACCOUNT = 'default'
const ACCOUNTS_FILE = 'coding-opus-accounts.json'
const USAGE_FILE = 'coding-opus-usage.json'
const NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/
const MAIN_WINDOWS = ['5h', 'week'] as const
const STALE_MINUTES = 30

type Entry = {
  name: string
  home: string
  linked: boolean
  email: string | null
  active: boolean
  ready: boolean
}
type LocalFile = {
  version?: number
  providers?: Partial<Record<string, { name?: unknown; home?: unknown }[]>>
  order?: Partial<Record<string, unknown>>
}
type Window = { usedPercent?: unknown; resetsAt?: unknown }
type Reading = { windows?: Record<string, Window>; observedAt?: unknown }

export type CodingOpusAccountsContext = {
  stateDir: string
  env: NodeJS.ProcessEnv
  now: Date
  thresholds: { critical: number; stop: number }
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string): string =>
    process.platform === 'win32' ? resolve(value).toLowerCase() : resolve(value)
  return normalize(left) === normalize(right)
}

function defaultHome(provider: CodingOpusAccountProvider, env: NodeJS.ProcessEnv): string {
  return provider === 'codex'
    ? env.CODEX_HOME || join(homedir(), '.codex')
    : env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

/** orchestrate.py `email_account_name`. */
export function emailAccountName(email: string, taken: Set<string>, accountId: string): string {
  let base =
    email
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .slice(0, 32)
      .replace(/[-_]+$/, '') || 'account'
  if (!NAME.test(base)) {
    base = 'account'
  }
  if (!taken.has(base) && base !== DEFAULT_ACCOUNT) {
    return base
  }
  const suffix = `-${
    accountId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 6) || 'x'
  }`
  return base.slice(0, 32 - suffix.length).replace(/[-_]+$/, '') + suffix
}

function localFile(context: CodingOpusAccountsContext): LocalFile {
  return readJson<LocalFile>(join(context.stateDir, ACCOUNTS_FILE)) ?? {}
}

function entries(context: CodingOpusAccountsContext, provider: CodingOpusAccountProvider): Entry[] {
  const local: Entry[] = []
  for (const raw of localFile(context).providers?.[provider] ?? []) {
    if (typeof raw?.name === 'string' && NAME.test(raw.name) && typeof raw.home === 'string') {
      local.push({
        name: raw.name,
        home: raw.home,
        linked: false,
        email: null,
        active: false,
        ready: true
      })
    }
  }
  const taken = new Set(local.map((entry) => entry.name))
  const homes: string[] = []
  const linked: Entry[] = []
  let files: string[] = []
  try {
    files = readdirSync(context.stateDir)
      .filter(
        (name) => name.startsWith(CODING_OPUS_LINKED_ACCOUNTS_PREFIX) && name.endsWith('.json')
      )
      .sort()
  } catch {
    files = []
  }
  for (const file of files) {
    const raw = readJson<{
      version?: number
      active?: Record<string, unknown>
      providers?: Record<string, { id?: unknown; email?: unknown; home?: unknown }[]>
    }>(join(context.stateDir, file))
    if (raw?.version !== 1 || !raw.providers) {
      continue
    }
    for (const item of raw.providers[provider] ?? []) {
      const { id, email, home } = item ?? {}
      if (typeof id !== 'string' || typeof email !== 'string' || typeof home !== 'string') {
        continue
      }
      if (!id || !email || !resolve(home) || homes.some((seen) => samePath(seen, home))) {
        continue
      }
      homes.push(home)
      if (samePath(home, defaultHome(provider, context.env))) {
        continue
      }
      const name = emailAccountName(email, taken, id)
      taken.add(name)
      linked.push({
        name,
        home,
        linked: true,
        email,
        active: raw.active?.[provider] === id,
        ready: existsSync(home)
      })
    }
  }
  return [...local, ...linked]
}

export function accountRotation(
  context: CodingOpusAccountsContext,
  provider: CodingOpusAccountProvider
): string[] {
  const all = entries(context, provider)
  const names = all.filter((entry) => entry.ready).map((entry) => entry.name)
  if (names.length === 0) {
    return []
  }
  const saved = localFile(context).order?.[provider]
  const order = (Array.isArray(saved) ? saved : []).filter(
    (name): name is string =>
      typeof name === 'string' && (name === DEFAULT_ACCOUNT || names.includes(name))
  )
  if (order.length > 0) {
    return [...order, ...names.filter((name) => !order.includes(name))]
  }
  const linked = new Set(all.filter((entry) => entry.linked).map((entry) => entry.name))
  return [
    DEFAULT_ACCOUNT,
    ...names.filter((name) => linked.has(name)),
    ...names.filter((name) => !linked.has(name))
  ]
}

function quotaHeadline(
  context: CodingOpusAccountsContext,
  reading: Reading | undefined
): CodingOpusAccountRow['quota'] {
  const observed =
    typeof reading?.observedAt === 'string' ? Date.parse(reading.observedAt) : Number.NaN
  const stale =
    !Number.isFinite(observed) || context.now.getTime() - observed > STALE_MINUTES * 60_000
  let best: CodingOpusAccountRow['quota'] = null
  for (const name of MAIN_WINDOWS) {
    const window = reading?.windows?.[name]
    const used = typeof window?.usedPercent === 'number' ? window.usedPercent : Number.NaN
    const resetsAt = typeof window?.resetsAt === 'string' ? window.resetsAt : ''
    const resetMs = Date.parse(resetsAt)
    if (!Number.isFinite(used) || !Number.isFinite(resetMs)) {
      continue
    }
    const reset = resetMs <= context.now.getTime()
    const usedPercent = reset ? 0 : used
    if (!best || usedPercent > best.usedPercent) {
      best = {
        window: name,
        usedPercent,
        resetsAt,
        low: !reset && used >= context.thresholds.critical,
        blocked: !reset && used >= context.thresholds.stop,
        stale
      }
    }
  }
  return best
}

export function readCodingOpusAccountsAt(context: CodingOpusAccountsContext): CodingOpusAccounts {
  const usage =
    readJson<{ providers?: Record<string, Reading> }>(join(context.stateDir, USAGE_FILE))
      ?.providers ?? {}
  const providers = {} as CodingOpusAccounts['providers']
  for (const provider of PROVIDERS) {
    const all = new Map(entries(context, provider).map((entry) => [entry.name, entry]))
    const rotation = accountRotation(context, provider)
    const names = [
      ...(rotation.length > 0 ? rotation : [DEFAULT_ACCOUNT]),
      ...[...all.keys()].filter((name) => !rotation.includes(name))
    ]
    providers[provider] = names.map((name) => {
      const entry = all.get(name)
      const key = name === DEFAULT_ACCOUNT ? provider : `${provider}@${name}`
      return {
        name,
        from: !entry ? 'cli' : entry.linked ? 'coding-agent' : 'coding-opus',
        email: entry?.email ?? null,
        ready: entry?.ready ?? true,
        inRotation: rotation.length === 0 || rotation.includes(name),
        activeInCodingAgent: entry?.active ?? false,
        quota: quotaHeadline(context, usage[key])
      }
    })
  }
  return { providers }
}

/** orchestrate.py `order_accounts`: saves the order the runner tries this provider's accounts in. */
export function orderCodingOpusAccountsAt(
  context: CodingOpusAccountsContext,
  provider: CodingOpusAccountProvider,
  names: string[]
): CodingOpusAccountsResult {
  if (!PROVIDERS.includes(provider)) {
    return { ok: false, error: `unknown provider ${String(provider)}` }
  }
  const known = new Set([DEFAULT_ACCOUNT, ...entries(context, provider).map((entry) => entry.name)])
  const unknown = names.filter((name) => !known.has(name))
  if (names.length === 0 || unknown.length > 0 || new Set(names).size !== names.length) {
    return {
      ok: false,
      error: `order needs known ${provider} accounts once each${unknown.length ? `; unknown: ${unknown.join(', ')}` : ''}`
    }
  }
  const path = join(context.stateDir, ACCOUNTS_FILE)
  const current = localFile(context)
  const next = {
    version: 1,
    providers: current.providers ?? {},
    order: { ...current.order, [provider]: names }
  }
  const temporary = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    rmSync(temporary, { force: true })
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  return { ok: true, accounts: readCodingOpusAccountsAt(context) }
}

function thresholds(): { critical: number; stop: number } {
  try {
    const doc = parse(readFileSync(codingOpusPlaybooksPath(), 'utf8')) as {
      quota?: { criticalThreshold?: unknown; stopAt?: unknown }
    }
    const critical = Number(doc?.quota?.criticalThreshold ?? 80)
    const stop = Number(doc?.quota?.stopAt ?? Math.max(95, critical))
    if (Number.isFinite(critical) && Number.isFinite(stop)) {
      return { critical, stop }
    }
  } catch {
    // No user copy: the runner's defaults apply.
  }
  return { critical: 80, stop: 95 }
}

function liveContext(): CodingOpusAccountsContext {
  return {
    stateDir: codingOpusStateDir(),
    env: process.env,
    now: new Date(),
    thresholds: thresholds()
  }
}

export function readCodingOpusAccounts(): CodingOpusAccountsResult {
  try {
    return { ok: true, accounts: readCodingOpusAccountsAt(liveContext()) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function orderCodingOpusAccounts(
  provider: CodingOpusAccountProvider,
  names: string[]
): CodingOpusAccountsResult {
  return orderCodingOpusAccountsAt(liveContext(), provider, names)
}
