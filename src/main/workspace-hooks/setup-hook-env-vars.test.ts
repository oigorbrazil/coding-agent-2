import { expect, it } from 'vitest'
import { getSetupEnvVars } from './setup-hook-env-vars'

it('exports both naming contracts for user hooks', () => {
  expect(getSetupEnvVars({ path: '/projects/repo' }, '/worktrees/feature')).toEqual({
    CODING_AGENT_ROOT_PATH: '/projects/repo',
    CODING_AGENT_WORKTREE_PATH: '/worktrees/feature',
    CODING_AGENT_WORKSPACE_NAME: 'feature',
    ORCA_ROOT_PATH: '/projects/repo',
    ORCA_WORKTREE_PATH: '/worktrees/feature',
    ORCA_WORKSPACE_NAME: 'feature',
    CONDUCTOR_ROOT_PATH: '/projects/repo',
    GHOSTX_ROOT_PATH: '/projects/repo'
  })
})
