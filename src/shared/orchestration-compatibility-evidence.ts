import { readAppEnv, appEnvKeys } from './app-env'
const MAX_EVIDENCE_FIELD_LENGTH = 4_096

export const ORCHESTRATION_COMPATIBILITY_HOST_KIND_ENV =
  'ORCA_ORCHESTRATION_COMPATIBILITY_HOST_KIND'
export const ORCHESTRATION_COMPATIBILITY_HOST_ID_ENV = 'ORCA_ORCHESTRATION_COMPATIBILITY_HOST_ID'
export const ORCHESTRATION_COMPATIBILITY_HOST_INCARNATION_ENV =
  'ORCA_ORCHESTRATION_COMPATIBILITY_HOST_INCARNATION'
export const ORCHESTRATION_COMPATIBILITY_ATTACHMENT_ENV =
  'ORCA_ORCHESTRATION_COMPATIBILITY_ATTACHMENT'

export type OrchestrationCompatibilityHostStamp =
  | {
      kind: 'wsl'
      hostId: string
      distro: string
    }
  | {
      kind: 'ssh'
      targetId: string
      connectionIncarnation: string
      attachmentId: string
    }

export type OrchestrationCompatibilityEvidence = {
  terminalHandle?: string
  paneKey?: string
  launchToken?: string
  host?: OrchestrationCompatibilityHostStamp
  /** Injected Coding Agent 2 session identity is authoritative when present; dispatch resolves it and validates any declared handle against it. */
  agentSessionId?: string
}

const SECRET_KEYS = new Set(
  appEnvKeys([
    'launchToken',
    'connectionIncarnation',
    'attachmentId',
    'compatibilityEvidence',
    'orchestrationCompatibilityEvidence',
    'ORCA_AGENT_LAUNCH_TOKEN',
    ORCHESTRATION_COMPATIBILITY_HOST_INCARNATION_ENV,
    ORCHESTRATION_COMPATIBILITY_ATTACHMENT_ENV
  ])
)

function boundedValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length <= MAX_EVIDENCE_FIELD_LENGTH ? trimmed : undefined
}

export function readOrchestrationCompatibilityEvidence(
  env: Readonly<Record<string, string | undefined>>
): OrchestrationCompatibilityEvidence | undefined {
  const terminalHandle = boundedValue(readAppEnv(env, 'TERMINAL_HANDLE'))
  const paneKey = boundedValue(readAppEnv(env, 'PANE_KEY'))
  const launchToken = boundedValue(readAppEnv(env, 'AGENT_LAUNCH_TOKEN'))
  const host = readHostStamp(env)
  if (!terminalHandle && !paneKey && !launchToken && !host) {
    return undefined
  }
  return {
    ...(terminalHandle ? { terminalHandle } : {}),
    ...(paneKey ? { paneKey } : {}),
    ...(launchToken ? { launchToken } : {}),
    ...(host ? { host } : {})
  }
}

function readHostStamp(
  env: Readonly<Record<string, string | undefined>>
): OrchestrationCompatibilityHostStamp | undefined {
  const kind = boundedValue(readAppEnv(env, 'ORCHESTRATION_COMPATIBILITY_HOST_KIND'))
  const hostId = boundedValue(readAppEnv(env, 'ORCHESTRATION_COMPATIBILITY_HOST_ID'))
  const incarnation = boundedValue(readAppEnv(env, 'ORCHESTRATION_COMPATIBILITY_HOST_INCARNATION'))
  const attachment = boundedValue(readAppEnv(env, 'ORCHESTRATION_COMPATIBILITY_ATTACHMENT'))
  if (kind === 'wsl' && hostId && incarnation) {
    return { kind, hostId, distro: incarnation }
  }
  if (kind === 'ssh' && hostId && incarnation && attachment) {
    return {
      kind,
      targetId: hostId,
      connectionIncarnation: incarnation,
      attachmentId: attachment
    }
  }
  return undefined
}

export function redactOrchestrationCompatibilitySecrets(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>())
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value !== 'object' || value === null) {
    return value
  }
  if (seen.has(value)) {
    return '[circular]'
  }
  seen.add(value)
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, seen))
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEYS.has(key) ? '[redacted]' : redactValue(entry, seen)
    ])
  )
}
