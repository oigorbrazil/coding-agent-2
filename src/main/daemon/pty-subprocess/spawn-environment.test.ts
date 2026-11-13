import { afterEach, expect, it, vi } from 'vitest'
import { createDaemonPtyEnvironment } from './spawn-environment'

afterEach(() => vi.unstubAllEnvs())

it('lets a legacy caller replace inherited modern pane identity under both names', () => {
  vi.stubEnv('CODING_AGENT_PANE_KEY', 'parent-pane')
  const env = createDaemonPtyEnvironment({
    sessionId: 'session-7',
    cols: 80,
    rows: 24,
    env: { ORCA_PANE_KEY: 'child-pane', ORCA_AGENT_LAUNCH_TOKEN: 'child-launch' }
  })
  expect(env).toMatchObject({
    CODING_AGENT_PANE_KEY: 'child-pane',
    ORCA_PANE_KEY: 'child-pane',
    CODING_AGENT_AGENT_PANE: 'child-pane',
    ORCA_AGENT_PANE: 'child-pane',
    CODING_AGENT_AGENT_LAUNCH_TOKEN: 'child-launch',
    ORCA_AGENT_LAUNCH_TOKEN: 'child-launch'
  })
})

it('scrubs both spellings when either spelling is requested for deletion', () => {
  const env = createDaemonPtyEnvironment({
    sessionId: 'session-7',
    cols: 80,
    rows: 24,
    env: {
      CODING_AGENT_PANE_KEY: 'child',
      ORCA_PANE_KEY: 'old',
      CODING_AGENT_CODEX_HOME: '/overlay',
      ORCA_CODEX_HOME: '/old-overlay'
    },
    envToDelete: ['ORCA_PANE_KEY', 'CODING_AGENT_CODEX_HOME']
  })
  expect(env.CODING_AGENT_PANE_KEY).toBeUndefined()
  expect(env.ORCA_PANE_KEY).toBeUndefined()
  expect(env.CODING_AGENT_AGENT_PANE).toBeUndefined()
  expect(env.ORCA_AGENT_PANE).toBeUndefined()
  expect(env.CODING_AGENT_CODEX_HOME).toBeUndefined()
  expect(env.ORCA_CODEX_HOME).toBeUndefined()
})

it('uses the modern hook transport when both spellings arrive from the caller', () => {
  const env = createDaemonPtyEnvironment({
    sessionId: 'session-7',
    cols: 80,
    rows: 24,
    env: { CODING_AGENT_AGENT_HOOK_TOKEN: 'new-token', ORCA_AGENT_HOOK_TOKEN: 'old-token' }
  })
  expect(env.CODING_AGENT_AGENT_HOOK_TOKEN).toBe('new-token')
  expect(env.ORCA_AGENT_HOOK_TOKEN).toBe('new-token')
})
