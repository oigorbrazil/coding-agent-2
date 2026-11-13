import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  CodingOpusCatalogModel,
  CodingOpusModelCatalog,
  CodingOpusModelCatalogResult
} from '../../shared/coding-opus'
import { codingOpusBundledSkillDir, codingOpusStateDir } from './coding-opus-paths'

// Mirrors orchestrate.py `model_catalog`: Codex's own model list first, then the skill's price table.

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

function isMap(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function codingOpusModelCatalogFrom(sources: {
  codexCache: unknown
  priceTables: unknown[]
}): CodingOpusModelCatalog {
  const providers: Record<string, CodingOpusCatalogModel[]> = {}
  const cached = isMap(sources.codexCache) ? sources.codexCache.models : null
  for (const entry of Array.isArray(cached) ? cached : []) {
    if (!isMap(entry) || (entry.visibility ?? 'list') !== 'list') {
      continue
    }
    const slug = typeof entry.slug === 'string' ? entry.slug : entry.id
    if (typeof slug !== 'string' || !SAFE_NAME.test(slug)) {
      continue
    }
    const upgrade = isMap(entry.upgrade) ? entry.upgrade.model : entry.upgrade
    ;(providers.codex ??= []).push({
      id: slug,
      source: 'cli',
      description: typeof entry.description === 'string' ? entry.description : null,
      upgrade: typeof upgrade === 'string' ? upgrade : null
    })
  }
  for (const table of sources.priceTables) {
    const models = isMap(table) && isMap(table.models) ? table.models : {}
    for (const key of Object.keys(models)) {
      const slash = key.indexOf('/')
      if (slash <= 0) {
        continue
      }
      const provider = key.slice(0, slash)
      const id = key.slice(slash + 1)
      const list = (providers[provider] ??= [])
      if (!list.some((model) => model.id === id)) {
        list.push({ id, source: 'prices' })
      }
    }
  }
  return { providers }
}

export function readCodingOpusModelCatalog(): CodingOpusModelCatalogResult {
  try {
    const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex')
    return {
      ok: true,
      catalog: codingOpusModelCatalogFrom({
        codexCache: readJson(join(codexHome, 'models_cache.json')),
        priceTables: [
          readJson(join(codingOpusBundledSkillDir(), 'prices.json')),
          readJson(join(codingOpusStateDir(), 'coding-opus-prices.json'))
        ]
      })
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
