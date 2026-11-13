import { type CursorEvent, getCursorHookResponse } from './hook-events'
import { windowsAppEnvRestore } from '../../shared/app-env-script'
import { appEnvPairs } from '../../shared/app-env'
import {
  buildWindowsAgentHookPostCommand,
  wrapPosixHookCommand,
  buildWindowsHookPowerShellCommand,
  wrapWindowsPowerShellEncodedCommand
} from '../agent-hooks/installer-utils'
import { posixCurlCommand } from '../agent-hooks/hook-post-command'
import {
  buildPosixHookEndpointReloadLines,
  buildWindowsHookEndpointReloadLines,
  buildPosixHookPayloadCapture,
  buildPosixHookSpoolLines,
  buildWindowsHookEnvironmentGuardLines
} from '../agent-hooks/hook-stdin-contract'
import {
  buildPosixGrokReplayGuardLines,
  buildWindowsGrokReplayGuardLines
} from '../agent-hooks/grok-replay-guard'
import { quoteStartupArg } from '../../shared/agent-launch/startup/tui-agent-startup-shell'

const CURSOR_HOOK_RESPONSE_ENV = 'ORCA_CURSOR_HOOK_RESPONSE'

export function getPosixManagedCommand(scriptPath: string, eventName: CursorEvent): string {
  const response = getCursorHookResponse(eventName)
  return wrapPosixHookCommand(
    scriptPath,
    { ...appEnvPairs('CURSOR_HOOK_RESPONSE', response) },
    { fallbackStdout: response }
  )
}

export function getManagedCommand(scriptPath: string, eventName: CursorEvent): string {
  if (process.platform !== 'win32') {
    // Cursor uses the login shell; wrap the POSIX guard in sh with portable quoting.
    return `/bin/sh -c ${quoteStartupArg(getPosixManagedCommand(scriptPath, eventName), 'posix')}`
  }
  const response = getCursorHookResponse(eventName)
  const command = buildWindowsHookPowerShellCommand(
    scriptPath,
    { ...appEnvPairs('CURSOR_HOOK_RESPONSE', response) },
    { fallbackStdout: response }
  )
  // PowerShell 5.1 defaults to the ANSI code page when translating hook stdin.
  return wrapWindowsPowerShellEncodedCommand(
    `[Console]::InputEncoding = New-Object System.Text.UTF8Encoding; $OutputEncoding = [Console]::InputEncoding; ${command}`
  )
}

export function getManagedScript(target: 'local' | 'posix' = 'local'): string {
  if (target === 'local' && process.platform === 'win32') {
    return [
      '@echo off',
      'setlocal',
      ...windowsAppEnvRestore([
        'CURSOR_HOOK_RESPONSE',
        'AGENT_HOOK_ENDPOINT',
        'AGENT_HOOK_PORT',
        'AGENT_HOOK_TOKEN',
        'PANE_KEY',
        'TAB_ID',
        'AGENT_LAUNCH_TOKEN',
        'WORKTREE_ID',
        'AGENT_HOOK_ENV',
        'AGENT_HOOK_VERSION'
      ]),
      // Cursor permission hooks reject empty or invalid stdout (#15462).
      `if defined ${CURSOR_HOOK_RESPONSE_ENV} (echo %${CURSOR_HOOK_RESPONSE_ENV}%) else (echo {})`,
      // Refresh endpoints for PTYs that survived a Coding Agent 2 restart.
      ...buildWindowsHookEndpointReloadLines(),
      ...buildWindowsHookEnvironmentGuardLines(),
      ...buildWindowsGrokReplayGuardLines(),
      buildWindowsAgentHookPostCommand('cursor'),
      'exit /b 0',
      ''
    ].join('\r\n')
  }

  return [
    '#!/bin/sh',
    // Cursor permission hooks reject empty or invalid stdout (#15462).
    `if [ -n "$${CURSOR_HOOK_RESPONSE_ENV}" ]; then`,
    `  printf '%s\\n' "$${CURSOR_HOOK_RESPONSE_ENV}"`,
    'else',
    '  printf "{}\\n"',
    'fi',
    ...buildPosixHookPayloadCapture(),
    ...buildPosixGrokReplayGuardLines(),
    ...buildPosixHookSpoolLines('cursor'),
    // Refresh endpoints for PTYs that survived a Coding Agent 2 restart.
    ...buildPosixHookEndpointReloadLines(),
    'if [ -z "${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" ] || [ -z "${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}" ] || [ -z "${CODING_AGENT_PANE_KEY-$ORCA_PANE_KEY}" ]; then',
    '  spool_hook_event',
    '  exit 0',
    'fi',
    // Form encoding handles path-bearing IDs; stdin keeps large payloads off the command line.
    `printf '%s' "$payload" | ${posixCurlCommand()} -sS -X POST "http://127.0.0.1:\${CODING_AGENT_AGENT_HOOK_PORT-\${ORCA_AGENT_HOOK_PORT}}/hook/cursor" \\`,
    '  --connect-timeout 0.5 --max-time 1.5 \\',
    '  -H "Content-Type: application/x-www-form-urlencoded" \\',
    '  -H "X-Orca-Agent-Hook-Token: ${CODING_AGENT_AGENT_HOOK_TOKEN-${ORCA_AGENT_HOOK_TOKEN}}" \\',
    '  --data-urlencode "paneKey=${CODING_AGENT_PANE_KEY-${ORCA_PANE_KEY}}" \\',
    '  --data-urlencode "tabId=${CODING_AGENT_TAB_ID-${ORCA_TAB_ID}}" \\',
    '  --data-urlencode "launchToken=${CODING_AGENT_AGENT_LAUNCH_TOKEN-${ORCA_AGENT_LAUNCH_TOKEN}}" \\',
    '  --data-urlencode "worktreeId=${CODING_AGENT_WORKTREE_ID-${ORCA_WORKTREE_ID}}" \\',
    '  --data-urlencode "env=${CODING_AGENT_AGENT_HOOK_ENV-${ORCA_AGENT_HOOK_ENV}}" \\',
    '  --data-urlencode "version=${CODING_AGENT_AGENT_HOOK_VERSION-${ORCA_AGENT_HOOK_VERSION}}" \\',
    '  --data-urlencode "payload@-" >/dev/null 2>&1 || spool_hook_event',
    'exit 0',
    ''
  ].join('\n')
}
