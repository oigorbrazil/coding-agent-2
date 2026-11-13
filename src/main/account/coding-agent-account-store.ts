import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { CodingAgentAccount } from '../../shared/coding-agent-account'

export type AccountSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
}

/** On-disk shape. Like the other provider tokens, the session sits in plaintext app data. */
export type StoredAccount = {
  version: 1
  name: string
  email: string
  photo: string | null
  emailVerified: boolean
  verifiedAt: number | null
  server: { url: string; anonKey: string } | null
  session: AccountSession | null
}

const EMPTY: StoredAccount = {
  version: 1,
  name: '',
  email: '',
  photo: null,
  emailVerified: false,
  verifiedAt: null,
  server: null,
  session: null
}

function accountPath(): string {
  return join(app.getPath('userData'), 'coding-agent-2-account.json')
}

export async function readStoredAccount(): Promise<StoredAccount> {
  try {
    const parsed: Partial<StoredAccount> = JSON.parse(await readFile(accountPath(), 'utf8'))
    return { ...EMPTY, ...parsed, version: 1 }
  } catch {
    return { ...EMPTY }
  }
}

/** Atomic write (tmp → rename), the same pattern the app uses for its other state files. */
export async function writeStoredAccount(account: StoredAccount): Promise<void> {
  const path = accountPath()
  await mkdir(dirname(path), { recursive: true })
  const staging = `${path}.tmp`
  await writeFile(staging, `${JSON.stringify(account, null, 2)}\n`)
  await rename(staging, path)
}

export function publicAccount(stored: StoredAccount): CodingAgentAccount {
  return {
    name: stored.name,
    email: stored.email,
    photo: stored.photo,
    emailVerified: stored.emailVerified,
    verifiedAt: stored.verifiedAt,
    signedIn: stored.session !== null,
    server: { url: stored.server?.url ?? '', configured: stored.server !== null }
  }
}
