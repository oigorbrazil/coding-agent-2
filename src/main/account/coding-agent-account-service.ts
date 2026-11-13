import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import type {
  CodingAgentAccountProfileUpdate,
  CodingAgentAccountResult
} from '../../shared/coding-agent-account'
import {
  publicAccount,
  readStoredAccount,
  writeStoredAccount,
  type StoredAccount
} from './coding-agent-account-store'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PHOTO_BYTES = 1024 * 1024
const PHOTO_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}
const REQUEST_TIMEOUT_MS = 15_000

function ok(account: StoredAccount): CodingAgentAccountResult {
  return { ok: true, account: publicAccount(account) }
}

function fail(account: StoredAccount, error: string): CodingAgentAccountResult {
  return { ok: false, error, account: publicAccount(account) }
}

export async function getAccount(): Promise<CodingAgentAccountResult> {
  return ok(await readStoredAccount())
}

function validPhoto(photo: string | null): boolean {
  return photo === null || photo.startsWith('data:image/') || /^https:\/\/\S+$/i.test(photo)
}

export async function saveAccountProfile(
  update: CodingAgentAccountProfileUpdate
): Promise<CodingAgentAccountResult> {
  const current = await readStoredAccount()
  const email = update.email.trim().toLowerCase()
  if (email && !EMAIL.test(email)) {
    return fail(current, 'invalid-email')
  }
  if (!validPhoto(update.photo)) {
    return fail(current, 'invalid-photo')
  }
  const emailChanged = email !== current.email
  const next: StoredAccount = {
    ...current,
    name: update.name.trim().slice(0, 80),
    email,
    photo: update.photo,
    // A new address must be confirmed again; the old session belonged to the old one.
    emailVerified: emailChanged ? false : current.emailVerified,
    verifiedAt: emailChanged ? null : current.verifiedAt,
    session: emailChanged ? null : current.session
  }
  await writeStoredAccount(next)
  return ok(next)
}

/** Reads a local image into a data URL so the photo survives the file moving. */
export async function readPhotoFile(path: string): Promise<string> {
  const type = PHOTO_TYPES[extname(path).toLowerCase()]
  if (!type) {
    throw new Error('unsupported-image')
  }
  if ((await stat(path)).size > MAX_PHOTO_BYTES) {
    throw new Error('image-too-large')
  }
  return `data:${type};base64,${(await readFile(path)).toString('base64')}`
}

export async function setAccountServer(
  url: string,
  anonKey: string
): Promise<CodingAgentAccountResult> {
  const current = await readStoredAccount()
  const cleanUrl = url.trim().replace(/\/+$/, '')
  if (!cleanUrl && !anonKey.trim()) {
    const cleared = { ...current, server: null, session: null }
    await writeStoredAccount(cleared)
    return ok(cleared)
  }
  if (!/^https:\/\/[^\s/]+/i.test(cleanUrl)) {
    return fail(current, 'server-url-must-be-https')
  }
  if (!anonKey.trim()) {
    return fail(current, 'server-key-required')
  }
  const next = { ...current, server: { url: cleanUrl, anonKey: anonKey.trim() }, session: null }
  await writeStoredAccount(next)
  return ok(next)
}

async function authRequest(
  server: NonNullable<StoredAccount['server']>,
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(`${server.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: server.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  const text = await response.text()
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  if (!response.ok) {
    const message = data.msg ?? data.error_description ?? data.message ?? `HTTP ${response.status}`
    throw new Error(String(message))
  }
  return data
}

/** Supabase email OTP: the server emails a one-time code to the linked address. */
export async function sendEmailCode(): Promise<CodingAgentAccountResult> {
  const current = await readStoredAccount()
  if (!current.server) {
    return fail(current, 'server-not-configured')
  }
  if (!current.email) {
    return fail(current, 'email-required')
  }
  try {
    await authRequest(current.server, 'otp', { email: current.email, create_user: true })
    return ok(current)
  } catch (error) {
    return fail(current, error instanceof Error ? error.message : String(error))
  }
}

export async function verifyEmailCode(code: string): Promise<CodingAgentAccountResult> {
  const current = await readStoredAccount()
  if (!current.server) {
    return fail(current, 'server-not-configured')
  }
  const token = code.replace(/\s+/g, '')
  if (!/^\d{6,10}$/.test(token)) {
    return fail(current, 'invalid-code')
  }
  try {
    const data = await authRequest(current.server, 'verify', {
      type: 'email',
      email: current.email,
      token
    })
    const user = (data.user ?? {}) as Record<string, unknown>
    const next: StoredAccount = {
      ...current,
      emailVerified: true,
      verifiedAt: Date.now(),
      session: {
        accessToken: String(data.access_token ?? ''),
        refreshToken: String(data.refresh_token ?? ''),
        expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
        userId: String(user.id ?? '')
      }
    }
    await writeStoredAccount(next)
    return ok(next)
  } catch (error) {
    return fail(current, error instanceof Error ? error.message : String(error))
  }
}

export async function signOutAccount(): Promise<CodingAgentAccountResult> {
  const current = await readStoredAccount()
  if (current.server && current.session) {
    // Best effort: the local session is dropped even when the server cannot be reached.
    await fetch(`${current.server.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: current.server.anonKey,
        Authorization: `Bearer ${current.session.accessToken}`
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    }).catch(() => undefined)
  }
  const next = { ...current, session: null }
  await writeStoredAccount(next)
  return ok(next)
}
