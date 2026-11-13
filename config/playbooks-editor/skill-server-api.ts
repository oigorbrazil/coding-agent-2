import type {
  CodingOpusAccountProvider,
  CodingOpusAccountsResult,
  CodingOpusModelCatalogResult,
  CodingOpusPlaybooks,
  CodingOpusPlaybooksSaveResult
} from '../../src/shared/coding-opus'

// The page is served by `orchestrate.py editor` on 127.0.0.1 with a one-time token in the hash.
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Coding-Opus-Token': token }
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the skill's local editor server answers with this JSON shape.
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  return body
}

/** Gives the shared editor the same `window.api.codingOpus` surface the desktop app provides. */
export function installSkillServerApi(): void {
  const codingOpus = {
    readPlaybooks: () => call<CodingOpusPlaybooks>('/api/playbooks'),
    savePlaybooks: (text: string) =>
      call<CodingOpusPlaybooksSaveResult>('/api/playbooks', {
        method: 'POST',
        body: JSON.stringify({ text })
      }).catch((error: unknown): CodingOpusPlaybooksSaveResult => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })),
    playbooksStamp: () => call<{ stamp: number }>('/api/stamp').then((body) => body.stamp),
    modelCatalog: () =>
      call<CodingOpusModelCatalogResult>('/api/models').catch(
        (error: unknown): CodingOpusModelCatalogResult => ({ ok: false, error: String(error) })
      ),
    readAccounts: () =>
      call<CodingOpusAccountsResult>('/api/accounts').catch(
        (error: unknown): CodingOpusAccountsResult => ({ ok: false, error: String(error) })
      ),
    orderAccounts: (provider: CodingOpusAccountProvider, names: string[]) =>
      call<CodingOpusAccountsResult>('/api/accounts/order', {
        method: 'POST',
        body: JSON.stringify({ provider, names })
      }).catch((error: unknown): CodingOpusAccountsResult => ({ ok: false, error: String(error) }))
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the standalone page installs the desktop api shape the shared editor reads.
  ;(window as unknown as { api: { codingOpus: typeof codingOpus } }).api = { codingOpus }
  // Tell the server the page is still open; it shuts down a while after the last ping.
  window.setInterval(() => void call('/api/ping').catch(() => undefined), 20_000)
}
