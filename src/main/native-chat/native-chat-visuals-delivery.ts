import type { StructuredAgentSessionLogger } from './agent-session-wire/host/structured-agent-session-logger'
import {
  type NativeChatVisualsSkillLocation,
  resolveNativeChatVisualsSkillLocation
} from './native-chat-visuals-skill-location'
import { appEnvPairs, deleteAppEnv } from '../../shared/app-env'
// Best-effort visual setup must never prevent chat startup.

import { mkdir } from 'node:fs/promises'

import { nativeChatScratchFolderFor } from './native-chat-scratch-folder'

/** Keep the per-chat path in the child environment rather than generated skill text. */
export const NATIVE_CHAT_SCRATCH_DIR_ENV = 'ORCA_CHAT_SCRATCH_DIR'

/** Strip the legacy name so launching Coding Agent 2 from a chat cannot leak that folder to new agents. */
export const LEGACY_NATIVE_CHAT_VISUALS_DIR_ENV = 'ORCA_CHAT_VISUALS_DIR'

export type NativeChatVisualsLaunch = {
  folder: string
  skill: NativeChatVisualsSkillLocation
}

/** null disables visuals; preparation never throws. */
export type PrepareNativeChatVisuals = (
  sessionId: string
) => Promise<NativeChatVisualsLaunch | null>

export function createNativeChatVisualsDelivery(deps: {
  stateDirectory: string
  logger: StructuredAgentSessionLogger
  isEnabled?: () => boolean
  resolveSkill?: () => Promise<NativeChatVisualsSkillLocation | null>
}): PrepareNativeChatVisuals {
  const resolveSkill = deps.resolveSkill ?? (() => resolveNativeChatVisualsSkillLocation())
  return async (sessionId) => {
    try {
      if (deps.isEnabled?.() === false) {
        return null
      }
      const skill = await resolveSkill()
      if (!skill) {
        deps.logger.warn('native-chat visuals skill is missing from this install', {
          scope: 'nativeChatVisuals.skill',
          sessionId
        })
        return null
      }
      const folder = nativeChatScratchFolderFor(deps.stateDirectory, sessionId)
      await mkdir(folder, { recursive: true, mode: 0o700 })
      return { folder, skill }
    } catch (error) {
      deps.logger.warn('native-chat scratch folder could not be prepared', {
        scope: 'nativeChatVisuals.folder',
        sessionId,
        error
      })
      return null
    }
  }
}

/** Remove inherited folder values when visuals are unavailable to prevent cross-chat writes. */
export function withNativeChatVisualsEnv(
  env: Record<string, string>,
  visuals: NativeChatVisualsLaunch | null
): Record<string, string> {
  const rest = { ...env }
  deleteAppEnv(rest, 'CHAT_SCRATCH_DIR')
  deleteAppEnv(rest, 'CHAT_VISUALS_DIR')
  return visuals ? { ...rest, ...appEnvPairs('CHAT_SCRATCH_DIR', visuals.folder) } : rest
}
