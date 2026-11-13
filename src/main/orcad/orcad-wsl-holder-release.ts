import type { OrcadDaemonRetirement } from './orcad-daemon-retirement'
import { readAppEnv } from '../../shared/app-env'
/**
 * Lets a WSL distro stop once its orcad idle-stops with nothing left to keep (R40). The desktop's
 * holder keeps the distro up; it reads this request and ends after orcad's pid exits.
 */
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { ORCAD_WSL_HOLDER_RELEASE_FILENAME } from '../../shared/orcad-idle-exit'
import { writeSecureFile } from '../../shared/secure-storage/secure-file'

export function orcadWslHolderReleasePath(userDataPath: string): string {
  return join(userDataPath, ORCAD_WSL_HOLDER_RELEASE_FILENAME)
}

/**
 * Only a WSL-host launch has a holder, and only a daemon that proved itself empty and left shows
 * no terminal would die with the distro. Why the launch marker: a setsid'd orcad may lack WSL_DISTRO_NAME.
 */
export function idleStopMayReleaseWslHolder(
  env: NodeJS.ProcessEnv,
  daemon: OrcadDaemonRetirement
): boolean {
  return readAppEnv(env, 'WSL_ORCAD_HOST') === '1' && daemon.retirement === 'retired'
}

export function requestOrcadWslHolderRelease(userDataPath: string, pid = process.pid): void {
  writeSecureFile(orcadWslHolderReleasePath(userDataPath), `${pid}\n`)
}

/**
 * A starting orcad may be given work, so any earlier request no longer stands. WSL-host launches
 * only; never throws, so a locked or unwritable data root cannot fail a start or a stop.
 */
export function withdrawOrcadWslHolderRelease(
  userDataPath: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (readAppEnv(env, 'WSL_ORCAD_HOST') !== '1') {
    return
  }
  try {
    rmSync(orcadWslHolderReleasePath(userDataPath), { force: true })
  } catch (error) {
    console.error('[orcad] could not withdraw the WSL holder release request:', error)
  }
}
