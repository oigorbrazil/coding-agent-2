import { describe, expect, it } from 'vitest'
import { appEnvPairs, deleteAppEnv, readAppEnv, setAppEnv } from './app-env'

describe('readAppEnv', () => {
  it.each([
    [{ CODING_AGENT_TELEMETRY_DISABLED: '1' }, '1'],
    [{ ORCA_TELEMETRY_DISABLED: 'legacy' }, 'legacy'],
    [{ CODING_AGENT_TELEMETRY_DISABLED: 'new', ORCA_TELEMETRY_DISABLED: 'old' }, 'new'],
    [{ CODING_AGENT_TELEMETRY_DISABLED: '', ORCA_TELEMETRY_DISABLED: '1' }, ''],
    [{ ORCA_TELEMETRY_DISABLED: '' }, ''],
    [{}, undefined]
  ])('resolves the supplied environment %j', (env, expected) => {
    expect(readAppEnv(env, 'TELEMETRY_DISABLED')).toBe(expected)
  })

  it('preserves the previous provider prefix between the new and legacy names', () => {
    const env = {
      CODING_AGENT_GITEA_TOKEN: '',
      CODING_GITEA_TOKEN: ' previous ',
      ORCA_GITEA_TOKEN: 'old'
    }
    expect(readAppEnv(env, 'GITEA_TOKEN', 'CODING_')).toBe('')
    delete (env as Partial<typeof env>).CODING_AGENT_GITEA_TOKEN
    expect(readAppEnv(env, 'GITEA_TOKEN', 'CODING_')).toBe('previous')
    env.CODING_GITEA_TOKEN = ' '
    expect(readAppEnv(env, 'GITEA_TOKEN', 'CODING_')).toBe('old')
  })
})

describe('child app environment', () => {
  it('publishes both names in a child environment', () => {
    expect({ PATH: '/bin', ...appEnvPairs('PANE_KEY', 'pane-7') }).toEqual({
      PATH: '/bin',
      CODING_AGENT_PANE_KEY: 'pane-7',
      ORCA_PANE_KEY: 'pane-7'
    })
  })

  it('replaces both inherited values, including an explicitly empty value', () => {
    const env = { CODING_AGENT_PANE_KEY: 'new-parent', ORCA_PANE_KEY: 'old-parent' }
    setAppEnv(env, 'PANE_KEY', 'child')
    expect(env).toEqual({ CODING_AGENT_PANE_KEY: 'child', ORCA_PANE_KEY: 'child' })
    setAppEnv(env, 'PANE_KEY', '')
    expect(env).toEqual({ CODING_AGENT_PANE_KEY: '', ORCA_PANE_KEY: '' })
  })

  it.each(['delete', 'undefined'] as const)('scrubs both aliases with %s', (operation) => {
    const env = { PATH: '/bin', CODING_AGENT_PANE_KEY: 'new', ORCA_PANE_KEY: 'old' }
    if (operation === 'delete') {
      deleteAppEnv(env, 'PANE_KEY')
    } else {
      setAppEnv(env, 'PANE_KEY', undefined)
    }
    expect(env).toEqual({ PATH: '/bin' })
  })
})
