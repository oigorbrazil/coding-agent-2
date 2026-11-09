/**
 * When the E9 guard may re-issue `wsl --terminate`: a runner's terminate can fail to take, leaving
 * the distro listed with nothing from Coding Agent 2 launched since. Retrying then is safe; retrying after
 * any Coding Agent 2 wsl.exe launch, terminal spawn or UNC touch could hide the very boot the guard exists to catch.
 */
import { PTY_SPAWN, UNC_TOUCH, type DiagnosticRecord } from './wsl-boot-diagnostics-log'

export const WSL_EXE = /(^|[\\/])wsl(\.exe)?$/i

/** A first terminate gets this long to show before it counts as not having taken. */
export const TERMINATE_RETRY_AFTER_MS = 2_000

export type TerminateRetryState = {
  retried: boolean
  confirmedStopped: boolean
  msSinceTerminate: number
  /** Coding Agent 2's spawn-log records since just before the first terminate. */
  spawnsSinceTerminate: readonly DiagnosticRecord[]
}

export function orcaWslLaunches(spawns: readonly DiagnosticRecord[]): DiagnosticRecord[] {
  return spawns.filter(
    (spawn) => WSL_EXE.test(spawn.file) || spawn.file === UNC_TOUCH || spawn.file === PTY_SPAWN
  )
}

/** One retry only, only while still listed, only once the first had time, only if Coding Agent 2 launched nothing. */
export function shouldRetryTerminate(state: TerminateRetryState): boolean {
  return (
    !state.retried &&
    !state.confirmedStopped &&
    state.msSinceTerminate >= TERMINATE_RETRY_AFTER_MS &&
    orcaWslLaunches(state.spawnsSinceTerminate).length === 0
  )
}
