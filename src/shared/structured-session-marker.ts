import { readAppEnv } from './app-env'
/** Nonidentifying child marker; current CLIs prefer injected session IDs. Retain it both for old children without IDs
 * and old CLIs that refuse by marker. A structured session has no pane: implicit guesses hit siblings and orchestration check is destructive by default. */
export const ORCA_STRUCTURED_SESSION_ENV = 'ORCA_STRUCTURED_SESSION'

export function hasStructuredSessionMarker(env: NodeJS.ProcessEnv = process.env): boolean {
  return (readAppEnv(env, 'STRUCTURED_SESSION') ?? '').length > 0
}
