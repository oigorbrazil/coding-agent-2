import {
  type PiAgentKind,
  PRIMARY_AGENT_DIR_ENV_BY_KIND,
  SOURCE_AGENT_DIR_ENV_BY_KIND
} from '../../../../shared/pi-agent-kind'
import {
  deleteAppEnv,
  readAppEnv,
  setAppEnv,
  readAppEnvKey,
  appEnvKeys
} from '../../../../shared/app-env'

import { readSessionShellStartupEnvVar } from '../../../pty/shell-startup/shell-startup-env'
import { getAgentLaunchExecutableName } from '../../../../shared/agent-launch/startup/agent-command-line-intent'
import {
  AGENT_HOOK_RUNTIME_ENV_KEYS,
  CLAUDE_CHILD_SESSION_STAMP_ENV_KEYS,
  ORCA_AGENT_SESSION_CALLER_ENV_KEYS
} from './spawn-env-keys'

export function readEnvWithProcessFallback(
  baseEnv: Record<string, string>,
  key: string
): string | undefined {
  return readAppEnvKey(baseEnv, key) ?? readAppEnvKey(process.env, key)
}

export function resolvePiAgentSourceDir(
  baseEnv: Record<string, string>,
  kind: PiAgentKind
): string | undefined {
  const sourceKey = SOURCE_AGENT_DIR_ENV_BY_KIND[kind]
  const primaryKey = PRIMARY_AGENT_DIR_ENV_BY_KIND[kind]

  const sourceDir = readEnvWithProcessFallback(baseEnv, sourceKey)
  if (sourceDir) {
    return sourceDir
  }

  if (kind === 'prime-agent') {
    return (
      readEnvWithProcessFallback(baseEnv, primaryKey) ??
      readSessionShellStartupEnvVar(primaryKey, baseEnv)
    )
  }

  const overlayKey = kind === 'omp' ? 'ORCA_OMP_CODING_AGENT_DIR' : 'ORCA_PI_CODING_AGENT_DIR'
  const otherOverlayKey = kind === 'omp' ? 'ORCA_PI_CODING_AGENT_DIR' : 'ORCA_OMP_CODING_AGENT_DIR'

  const publicDir = readEnvWithProcessFallback(baseEnv, primaryKey)
  const ownOverlayDir = readEnvWithProcessFallback(baseEnv, overlayKey)
  const otherOverlayDir = readEnvWithProcessFallback(baseEnv, otherOverlayKey)
  // Source-less inherited overlays must not be mirrored into another agent's tree.
  if (publicDir && publicDir !== ownOverlayDir && publicDir !== otherOverlayDir) {
    return publicDir
  }

  return readSessionShellStartupEnvVar(primaryKey, baseEnv)
}

export function resolveScopedPiAgentSourceDir(
  baseEnv: Record<string, string>,
  kind: PiAgentKind
): string | undefined {
  return readEnvWithProcessFallback(baseEnv, SOURCE_AGENT_DIR_ENV_BY_KIND[kind])
}

export function clearPiAgentShadowEnv(baseEnv: Record<string, string>, kind: PiAgentKind): void {
  if (kind === 'omp') {
    deleteAppEnv(baseEnv, 'OMP_CODING_AGENT_DIR')
    deleteAppEnv(baseEnv, 'OMP_SOURCE_AGENT_DIR')
    deleteAppEnv(baseEnv, 'OMP_STATUS_EXTENSION')
    return
  }
  if (kind === 'prime-agent') {
    deleteAppEnv(baseEnv, 'PRIME_AGENT_SOURCE_AGENT_DIR')
    deleteAppEnv(baseEnv, 'PRIME_AGENT_STATUS_EXTENSION')
    return
  }
  deleteAppEnv(baseEnv, 'PI_CODING_AGENT_DIR')
  deleteAppEnv(baseEnv, 'PI_SOURCE_AGENT_DIR')
}

export function exposePiManagedExtensionEnv(
  baseEnv: Record<string, string>,
  kind: PiAgentKind,
  managedEnv: Record<string, string>
): void {
  if (kind === 'omp') {
    deleteAppEnv(baseEnv, 'OMP_CODING_AGENT_DIR')
    if (readAppEnv(managedEnv, 'OMP_SOURCE_AGENT_DIR')) {
      setAppEnv(baseEnv, 'OMP_SOURCE_AGENT_DIR', readAppEnv(managedEnv, 'OMP_SOURCE_AGENT_DIR'))
    } else {
      deleteAppEnv(baseEnv, 'OMP_SOURCE_AGENT_DIR')
    }
    if (readAppEnv(managedEnv, 'OMP_STATUS_EXTENSION')) {
      setAppEnv(baseEnv, 'OMP_STATUS_EXTENSION', readAppEnv(managedEnv, 'OMP_STATUS_EXTENSION'))
    } else {
      deleteAppEnv(baseEnv, 'OMP_STATUS_EXTENSION')
    }
    return
  }
  if (kind === 'prime-agent') {
    if (readAppEnv(managedEnv, 'PRIME_AGENT_SOURCE_AGENT_DIR')) {
      setAppEnv(
        baseEnv,
        'PRIME_AGENT_SOURCE_AGENT_DIR',
        readAppEnv(managedEnv, 'PRIME_AGENT_SOURCE_AGENT_DIR')
      )
    } else {
      deleteAppEnv(baseEnv, 'PRIME_AGENT_SOURCE_AGENT_DIR')
    }
    return
  }
  deleteAppEnv(baseEnv, 'PI_CODING_AGENT_DIR')
  if (readAppEnv(managedEnv, 'PI_SOURCE_AGENT_DIR')) {
    setAppEnv(baseEnv, 'PI_SOURCE_AGENT_DIR', readAppEnv(managedEnv, 'PI_SOURCE_AGENT_DIR'))
  } else {
    deleteAppEnv(baseEnv, 'PI_SOURCE_AGENT_DIR')
  }
}

export function mergePtyEnvDeletions(
  existingKeys: string[] | undefined,
  ...additionalKeyGroups: readonly (readonly string[])[]
): string[] | undefined {
  if (!existingKeys && additionalKeyGroups.every((keys) => keys.length === 0)) {
    return undefined
  }
  return Array.from(new Set(appEnvKeys([...(existingKeys ?? []), ...additionalKeyGroups.flat()])))
}

export function removeCodexHomeDeletionRequests(keys: string[] | undefined): string[] | undefined {
  // Resume provenance selects the home; late deletions must not fall back to current account.
  const filtered = keys?.filter(
    (key) => key !== 'CODEX_HOME' && key !== 'ORCA_CODEX_HOME' && key !== 'CODING_AGENT_CODEX_HOME'
  )
  return filtered?.length ? filtered : undefined
}

export function getInheritedAgentHookEnvKeysToDelete(
  spawnEnv: Record<string, string> | undefined
): string[] {
  const env = spawnEnv ?? {}
  // Providers later merge ambient env; delete stale hooks without removing freshly injected coordinates.
  return [
    ...AGENT_HOOK_RUNTIME_ENV_KEYS,
    'ORCA_CLAUDE_AGENT_VIEW_PLUGIN_DIR',
    'ORCA_CLAUDE_CONFIG_DIR',
    'ORCA_OPENCODE_AGENT',
    'ORCA_OPENCODE_CONFIG_DIR',
    'ORCA_OPENCODE_SOURCE_CONFIG_DIR',
    'ORCA_MIMOCODE_CONFIG_DIR',
    'ORCA_MIMOCODE_SOURCE_CONFIG_DIR'
  ]
    .flatMap((key) => appEnvKeys([key]))
    .filter((key) => readAppEnvKey(env, key) === undefined)
}

export function getInheritedAgentSessionStampEnvKeysToDelete(
  spawnEnv: Record<string, string> | undefined
): string[] {
  const env = spawnEnv ?? {}
  // Explicit nested-Claude stamps survive; structured-session caller keys never belong to terminal panes.
  return [
    ...CLAUDE_CHILD_SESSION_STAMP_ENV_KEYS.filter((key) => readAppEnvKey(env, key) === undefined),
    ...ORCA_AGENT_SESSION_CALLER_ENV_KEYS,
    // A pane is never a Claude background job; an inherited job dir would silence its agent hooks.
    'CLAUDE_JOB_DIR'
  ]
}

export function isMimoLaunchCommand(launchCommand: string | undefined): boolean {
  return getAgentLaunchExecutableName(launchCommand) === 'mimo'
}

/** Call after the overlay env is restored: an explicit pane value wins over inherited markers. */
export function resolveMimocodeSourceConfigDir(
  baseEnv: Record<string, string>,
  inheritedEnv: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (baseEnv.MIMOCODE_CONFIG_DIR) {
    return baseEnv.MIMOCODE_CONFIG_DIR
  }
  if (readAppEnv(inheritedEnv, 'MIMOCODE_SOURCE_CONFIG_DIR')) {
    return readAppEnv(inheritedEnv, 'MIMOCODE_SOURCE_CONFIG_DIR')
  }
  const configDir = inheritedEnv.MIMOCODE_CONFIG_DIR
  return configDir && configDir === readAppEnv(inheritedEnv, 'MIMOCODE_CONFIG_DIR')
    ? undefined
    : configDir
}

export function resolveOpenCodeSourceConfigDir(
  baseEnv: Record<string, string>,
  inheritedEnv: NodeJS.ProcessEnv = process.env
): string | undefined {
  const configDir = baseEnv.OPENCODE_CONFIG_DIR ?? inheritedEnv.OPENCODE_CONFIG_DIR
  const orcaConfigDir =
    readAppEnv(baseEnv, 'OPENCODE_CONFIG_DIR') ?? readAppEnv(inheritedEnv, 'OPENCODE_CONFIG_DIR')
  if (configDir && orcaConfigDir && configDir !== orcaConfigDir) {
    return configDir
  }
  const sourceDir =
    readAppEnv(baseEnv, 'OPENCODE_SOURCE_CONFIG_DIR') ??
    readAppEnv(inheritedEnv, 'OPENCODE_SOURCE_CONFIG_DIR')
  if (sourceDir) {
    return sourceDir
  }

  // Matching public/private paths identify Coding Agent 2-owned state, not user config to mirror into child Orcas.
  if (configDir && orcaConfigDir && configDir === orcaConfigDir) {
    return undefined
  }

  return configDir ?? readSessionShellStartupEnvVar('OPENCODE_CONFIG_DIR', baseEnv)
}
