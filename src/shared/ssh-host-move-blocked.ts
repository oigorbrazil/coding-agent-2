import type { SshManagedServerStatus } from './ssh-types'

/** Unserved hosts block new Coding Agent 2 terminals; bridged hosts remain connected for their old terminals. */
export function isSshHostMoveBlocked(status: SshManagedServerStatus | undefined): boolean {
  return status?.kind === 'relay' && !status.bridged
}
