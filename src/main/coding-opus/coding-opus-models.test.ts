import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => '/app' } }))

const { codingOpusModelCatalogFrom } = await import('./coding-opus-models')

describe('codingOpusModelCatalogFrom', () => {
  it('lists the models Codex shows, then the price table, like the runner', () => {
    const catalog = codingOpusModelCatalogFrom({
      codexCache: {
        models: [
          { slug: 'gpt-9-sol', visibility: 'list', description: 'Latest workhorse.' },
          { slug: 'gpt-8-sol', visibility: 'list', upgrade: { model: 'gpt-9-sol' } },
          { slug: 'internal-review', visibility: 'hide' }
        ]
      },
      priceTables: [
        { models: { 'codex/gpt-9-sol': {}, 'claude/claude-opus-5-5': {} } },
        { models: { 'claude/claude-sonnet-5-5': {} } }
      ]
    })
    expect(catalog.providers.codex).toEqual([
      { id: 'gpt-9-sol', source: 'cli', description: 'Latest workhorse.', upgrade: null },
      { id: 'gpt-8-sol', source: 'cli', description: null, upgrade: 'gpt-9-sol' }
    ])
    expect(catalog.providers.claude).toEqual([
      { id: 'claude-opus-5-5', source: 'prices' },
      { id: 'claude-sonnet-5-5', source: 'prices' }
    ])
  })
})
