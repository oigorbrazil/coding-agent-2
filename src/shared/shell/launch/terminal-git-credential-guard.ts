import { readAppEnv, deleteAppEnv, setAppEnv, setAppEnvKey } from '../../app-env'
import { recognizeAgentLaunchCommand } from '../../agent-launch/startup/agent-command-line-intent'
import { gitCredentialPromptGuardEnv } from '../../git/commands/git-credential-prompt-env'

export const TERMINAL_GIT_CREDENTIAL_GUARD_POLICY_ENV =
  'ORCA_INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY'

/** Disable credential UI only for recognized agents and marked automation. */
export function applyTerminalGitCredentialPromptGuard(
  env: Record<string, string>,
  opts: {
    launchCommand?: string | null
    isUnattended?: boolean
    platform?: NodeJS.Platform
    /** A detached host reapplies the guard after its authoritative env merge. */
    deferGitConfigGuardToHost?: boolean
  }
): boolean {
  const explicitlyGuarded =
    readAppEnv(env, 'INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY') === 'guard'
  deleteAppEnv(env, 'INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY')

  const shouldGuard =
    opts.isUnattended === true ||
    Boolean(
      recognizeAgentLaunchCommand(opts.launchCommand, {
        includeHeadlessOneShot: true
      })
    )
  if (!explicitlyGuarded && !shouldGuard) {
    return false
  }

  const guarded = gitCredentialPromptGuardEnv(env, opts.platform ?? process.platform)
  if (!opts.deferGitConfigGuardToHost) {
    Object.assign(env, guarded)
    return true
  }

  // The daemon reapplies the guard after merging inherited env; send the policy and scalar guards.
  setAppEnv(env, 'INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY', 'guard')
  for (const [key, value] of Object.entries(guarded)) {
    if (typeof value !== 'string') {
      continue
    }
    if (key === 'WSLENV') {
      continue
    }
    if ((key === 'GIT_ASKPASS' || key === 'SSH_ASKPASS') && !Object.hasOwn(env, key)) {
      continue
    }
    setAppEnvKey(env, key, value)
  }
  return true
}
