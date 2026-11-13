import { runInNewContext } from 'node:vm'
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readAppEnv } from './app-env'
import { createAgentHookEndpointParser } from './agent-hook-listener/transport/agent-hook-endpoint-file'
import { buildPosixHookEndpointReloadLines } from '../main/agent-hooks/hook-stdin-contract'
import { runProcess } from '@coding-agent/process-host'
import { expect, it } from 'vitest'
import { appEnvReadExpression } from './app-env-script'
import { buildPosixScrubSafeEnvRestoreLines } from './agent-hook-listener/transport/agent-hook-scrub-safe-env'
import { buildUnixCliLauncher } from '../main/cli/cli-dev-launcher'
import { getPosixClaudeShellFunction } from './claude-shell-function'

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash'

it.skipIf(!existsSync(bash))(
  'restores scrubbed hook identity with modern values taking precedence',
  async () => {
    const result = await runProcess({
      program: bash,
      args: [
        '--noprofile',
        '--norc',
        '-c',
        `${buildPosixScrubSafeEnvRestoreLines().join('\n')}\nprintf '%s:%s' "$ORCA_PANE_KEY" "$CODING_AGENT_PANE_KEY"`
      ],
      env: { ...process.env, ORCA_PANE_KEY: 'legacy', CODING_AGENT_PANE_KEY: 'current' }
    })
    expect(result.code).toBe(0)
    expect(result.stdout).toBe('current:current')
  }
)

it.skipIf(!existsSync(bash))(
  'parses generated launch and account scripts without executing them',
  async () => {
    const result = await runProcess({
      program: bash,
      args: ['-n'],
      input:
        buildUnixCliLauncher('/unused/electron', '/unused/cli.js', '/profile') +
        getPosixClaudeShellFunction()
    })
    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)
  }
)

it.each([
  [{ CODING_AGENT_PANE_KEY: 'new', ORCA_PANE_KEY: 'old' }, 'new'],
  [{ ORCA_PANE_KEY: 'old' }, 'old'],
  [{ CODING_AGENT_PANE_KEY: '', ORCA_PANE_KEY: 'old' }, ''],
  [{}, undefined]
])('runs the standalone installed-hook reader without app imports', (env, expected) => {
  expect(runInNewContext(appEnvReadExpression('env', 'PANE_KEY'), { env })).toBe(expected)
})

it('embeds the endpoint parser without retaining bundled imports', () => {
  const parser = runInNewContext(
    `(${createAgentHookEndpointParser.toString()})(${readAppEnv.toString()})`
  )
  expect(
    parser(
      'ORCA_AGENT_HOOK_PORT=12\nCODING_AGENT_AGENT_HOOK_PORT=34\nORCA_AGENT_HOOK_TOKEN=token\nORCA_AGENT_HOOK_ENV=local\nORCA_AGENT_HOOK_VERSION=1'
    )
  ).toEqual({ port: '34', token: 'token', env: 'local', version: '1' })
})

it.skipIf(!existsSync(bash))(
  'reloads an older endpoint over inherited modern coordinates',
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'app-env-endpoint-'))
    const endpoint = join(root, 'endpoint.env')
    writeFileSync(endpoint, 'ORCA_AGENT_HOOK_PORT=4321\nORCA_AGENT_HOOK_TOKEN=fresh\n')
    try {
      const result = await runProcess({
        program: bash,
        args: ['--noprofile', '--norc', '-s'],
        input: `${buildPosixHookEndpointReloadLines().join(
          '\n'
        )}\nprintf "%s:%s" "\${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" "\${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}"`,
        env: {
          ...process.env,
          CODING_AGENT_AGENT_HOOK_ENDPOINT: endpoint.replaceAll('\\', '/'),
          CODING_AGENT_AGENT_HOOK_PORT: '1234',
          CODING_AGENT_AGENT_HOOK_TOKEN: 'stale'
        }
      })
      expect(result.code).toBe(0)
      expect(result.stdout).toBe('4321:fresh')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
)

it.skipIf(!existsSync(bash))(
  'exports both profile names from the installed Unix CLI launcher',
  async () => {
    const result = await runProcess({
      program: bash,
      args: ['--noprofile', '--norc', '-s'],
      input: buildUnixCliLauncher('/usr/bin/env', '-0', '/owning-profile', 'node'),
      env: {
        ...process.env,
        ORCA_USER_DATA_PATH: '/legacy-parent',
        CODING_AGENT_USER_DATA_PATH: '/modern-parent'
      }
    })
    expect(result.code).toBe(0)
    expect(result.stdout.split('\0')).toContain('ORCA_USER_DATA_PATH=/owning-profile')
    expect(result.stdout.split('\0')).toContain('CODING_AGENT_USER_DATA_PATH=/owning-profile')
  }
)
