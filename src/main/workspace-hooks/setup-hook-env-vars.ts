import type { Repo } from '../../shared/repo-types'
import { appEnvPairs } from '../../shared/app-env'
import { getRuntimePathBasename } from '../../shared/cross-platform-path'

// Keep WSL path translation in pty/wsl-orca-env.ts in sync; names and policies are not paths.
export const SETUP_RUNNER_PATH_ENV_KEYS = [
  'CODING_AGENT_ROOT_PATH',
  'CODING_AGENT_WORKTREE_PATH',
  'ORCA_ROOT_PATH',
  'ORCA_WORKTREE_PATH',
  'CONDUCTOR_ROOT_PATH',
  'GHOSTX_ROOT_PATH'
] as const

export function getSetupEnvVars(repo: Repo, worktreePath: string): Record<string, string> {
  return {
    CODING_AGENT_ROOT_PATH: repo.path,
    CODING_AGENT_WORKTREE_PATH: worktreePath,
    CODING_AGENT_WORKSPACE_NAME: getRuntimePathBasename(worktreePath),
    ORCA_ROOT_PATH: repo.path,
    ORCA_WORKTREE_PATH: worktreePath,
    ORCA_WORKSPACE_NAME: getRuntimePathBasename(worktreePath),
    // Legacy conductor.json compatibility.
    CONDUCTOR_ROOT_PATH: repo.path,
    GHOSTX_ROOT_PATH: repo.path
  }
}

export function getSetupRunnerEnvVars(repo: Repo, worktreePath: string): Record<string, string> {
  return {
    ...getSetupEnvVars(repo, worktreePath),
    // Unattended setup always needs credential protection, regardless of user opt-out.
    ...appEnvPairs('INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY', 'guard')
  }
}
