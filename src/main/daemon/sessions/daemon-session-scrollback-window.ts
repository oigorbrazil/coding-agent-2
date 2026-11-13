import { readAppEnv } from '../../../shared/app-env'
import { DESKTOP_TERMINAL_SCROLLBACK_ROWS_DEFAULT as DAEMON_RESTORE_SCROLLBACK_ROWS } from '../../../shared/terminal/replay/terminal-scrollback-policy'

// Bound live grid memory across many terminals; durable history supplies the deeper restore window.
export const DAEMON_SESSION_SCROLLBACK_ROWS = 1000
// Reject zero-context and oversized windows that defeat bounded retention.
const MIN_OVERRIDE_ROWS = 100
const MAX_OVERRIDE_ROWS = DAEMON_RESTORE_SCROLLBACK_ROWS

export function resolveDaemonSessionScrollbackRows(env: NodeJS.ProcessEnv = process.env): number {
  const raw = readAppEnv(env, 'DAEMON_SESSION_SCROLLBACK_ROWS')?.trim()
  if (!raw || !/^\d+$/.test(raw)) {
    return DAEMON_SESSION_SCROLLBACK_ROWS
  }
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < MIN_OVERRIDE_ROWS || parsed > MAX_OVERRIDE_ROWS) {
    return DAEMON_SESSION_SCROLLBACK_ROWS
  }
  return parsed
}
