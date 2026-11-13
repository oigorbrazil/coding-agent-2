import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => '/app' } }))

const { emailAccountName, orderCodingOpusAccountsAt, readCodingOpusAccountsAt } =
  await import('./coding-opus-accounts')

const folders: string[] = []
afterEach(() => {
  for (const path of folders.splice(0)) {
    rmSync(path, { recursive: true, force: true })
  }
})

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'coding-opus-accounts-ui-'))
  folders.push(root)
  const stateDir = join(root, 'state')
  const codexHome = join(root, 'codex')
  const work = join(root, 'managed', 'work')
  const second = join(root, 'managed', 'second')
  for (const path of [stateDir, codexHome, work, second]) {
    mkdirSync(path, { recursive: true })
  }
  writeFileSync(
    join(stateDir, 'coding-agent-accounts.app.json'),
    JSON.stringify({
      version: 1,
      active: { codex: 'c1', claude: null },
      providers: {
        codex: [
          { id: 'c1', email: 'Me@Work.example', home: work },
          { id: 'c2', email: 'me@work.example', home: second },
          { id: 'c3', email: 'sys@example', home: codexHome }
        ],
        claude: [{ id: 'k1', email: 'me@home.example', home: join(root, 'not-prepared') }]
      }
    })
  )
  writeFileSync(
    join(stateDir, 'coding-opus-accounts.json'),
    JSON.stringify({
      version: 1,
      providers: { codex: [{ name: 'spare', home: join(root, 'spare') }] },
      order: {}
    })
  )
  const now = new Date('2026-11-11T12:00:00Z')
  writeFileSync(
    join(stateDir, 'coding-opus-usage.json'),
    JSON.stringify({
      providers: {
        codex: {
          observedAt: '2026-11-11T11:50:00Z',
          windows: {
            '5h': { usedPercent: 40, resetsAt: '2026-11-11T14:00:00Z' },
            week: { usedPercent: 97, resetsAt: '2026-11-17T22:00:00Z' }
          }
        },
        'codex@me-work-example': {
          observedAt: '2026-11-11T08:00:00Z',
          windows: { '5h': { usedPercent: 99, resetsAt: '2026-11-11T11:00:00Z' } }
        }
      }
    })
  )
  return {
    root,
    stateDir,
    context: {
      stateDir,
      env: { CODEX_HOME: codexHome, CLAUDE_CONFIG_DIR: join(root, 'claude') },
      now,
      thresholds: { critical: 80, stop: 95 }
    }
  }
}

describe('emailAccountName', () => {
  it('matches the runner: a slug of the email, with an id suffix when taken', () => {
    expect(emailAccountName('Me@Work.example', new Set(), 'c1')).toBe('me-work-example')
    expect(emailAccountName('me@work.example', new Set(['me-work-example']), 'c-2')).toBe(
      'me-work-example-c2'
    )
  })
})

describe('readCodingOpusAccountsAt', () => {
  it('lists accounts in the rotation order the runner uses, with each quota headline', () => {
    const { context } = setup()
    const { providers } = readCodingOpusAccountsAt(context)
    expect(providers.codex.map((row) => [row.name, row.from])).toEqual([
      ['default', 'cli'],
      ['me-work-example', 'coding-agent'],
      ['me-work-example-c2', 'coding-agent'],
      ['spare', 'coding-opus']
    ])
    expect(providers.codex[0].quota).toMatchObject({
      window: 'week',
      usedPercent: 97,
      blocked: true
    })
    expect(providers.codex[1]).toMatchObject({
      activeInCodingAgent: true,
      email: 'Me@Work.example'
    })
    // A window past its reset reads as empty.
    expect(providers.codex[1].quota).toMatchObject({ usedPercent: 0, blocked: false, stale: true })
    expect(providers.claude.map((row) => [row.name, row.ready, row.inRotation])).toEqual([
      ['default', true, true],
      ['me-home-example', false, true]
    ])
  })
})

describe('orderCodingOpusAccountsAt', () => {
  it('saves the order next to the local accounts and refuses unknown names', () => {
    const { context, stateDir, root } = setup()
    const result = orderCodingOpusAccountsAt(context, 'codex', ['spare', 'default'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accounts.providers.codex.map((row) => row.name)).toEqual([
        'spare',
        'default',
        'me-work-example',
        'me-work-example-c2'
      ])
    }
    const saved = JSON.parse(readFileSync(join(stateDir, 'coding-opus-accounts.json'), 'utf8'))
    expect(saved.order.codex).toEqual(['spare', 'default'])
    expect(saved.providers.codex[0].home).toBe(join(root, 'spare'))
    expect(orderCodingOpusAccountsAt(context, 'codex', ['ghost'])).toEqual({
      ok: false,
      error: 'order needs known codex accounts once each; unknown: ghost'
    })
  })
})
