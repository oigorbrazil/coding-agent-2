import { windowsAppEnvRestore } from '../../shared/app-env-script'
import { posixCurlCommand } from '../agent-hooks/hook-post-command'
import {
  buildWindowsAgentHookPostCommand,
  getSharedManagedScriptPath
} from '../agent-hooks/installer-utils'
import {
  buildPosixHookEndpointReloadLines,
  buildWindowsHookEndpointReloadLines,
  buildPosixHookPayloadCapture,
  buildPosixHookSpoolLines,
  buildWindowsHookEnvironmentGuardLines
} from '../agent-hooks/hook-stdin-contract'

export function getManagedScriptFileName(): string {
  return process.platform === 'win32' ? 'copilot-hook.cmd' : 'copilot-hook.sh'
}

export function getManagedScriptPath(): string {
  return getSharedManagedScriptPath(getManagedScriptFileName())
}

export function getManagedScript(target: 'local' | 'posix' = 'local'): string {
  if (target === 'local' && process.platform === 'win32') {
    return [
      '@echo off',
      'setlocal',
      ...windowsAppEnvRestore([
        'COPILOT_HOOK_EVENT',
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
      // Why: Copilot consumes stdout for some hooks, so answer before any guard can exit.
      'echo {}',
      // Why: the direct registration passes the event as %1; the encoded fallback sets the env var.
      'if not "%~1"=="" (set "ORCA_COPILOT_HOOK_EVENT=%~1" & set "CODING_AGENT_COPILOT_HOOK_EVENT=%~1")',
      // Why: refresh endpoint coordinates for PTYs surviving a Coding Agent 2 restart.
      ...buildWindowsHookEndpointReloadLines(),
      ...buildWindowsHookEnvironmentGuardLines(),
      buildWindowsAgentHookPostCommand('copilot', [
        '  --data-urlencode "hookEventName=%ORCA_COPILOT_HOOK_EVENT%" ^'
      ]),
      'exit /b 0',
      ''
    ].join('\r\n')
  }

  return [
    '#!/bin/sh',
    "printf '{}\\n'",
    ...buildPosixHookPayloadCapture(),
    ...buildPosixHookSpoolLines('copilot'),
    // Answer Copilot before endpoint refresh, stdin parsing or posting can fail.
    ...buildPosixHookEndpointReloadLines(),
    'if [ -z "${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" ] || [ -z "${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}" ] || [ -z "${CODING_AGENT_PANE_KEY-$ORCA_PANE_KEY}" ]; then',
    '  spool_hook_event',
    '  exit 0',
    'fi',
    // Keep large tool payloads off curl's command line to avoid EDR false positives.
    `printf '%s' "$payload" | ${posixCurlCommand()} -sS -X POST "http://127.0.0.1:\${CODING_AGENT_AGENT_HOOK_PORT-\${ORCA_AGENT_HOOK_PORT}}/hook/copilot" \\`,
    '  --connect-timeout 0.5 --max-time 1.5 \\',
    '  -H "Content-Type: application/x-www-form-urlencoded" \\',
    '  -H "X-Orca-Agent-Hook-Token: ${CODING_AGENT_AGENT_HOOK_TOKEN-${ORCA_AGENT_HOOK_TOKEN}}" \\',
    '  --data-urlencode "paneKey=${CODING_AGENT_PANE_KEY-${ORCA_PANE_KEY}}" \\',
    '  --data-urlencode "tabId=${CODING_AGENT_TAB_ID-${ORCA_TAB_ID}}" \\',
    '  --data-urlencode "launchToken=${CODING_AGENT_AGENT_LAUNCH_TOKEN-${ORCA_AGENT_LAUNCH_TOKEN}}" \\',
    '  --data-urlencode "worktreeId=${CODING_AGENT_WORKTREE_ID-${ORCA_WORKTREE_ID}}" \\',
    '  --data-urlencode "hookEventName=${CODING_AGENT_COPILOT_HOOK_EVENT-${ORCA_COPILOT_HOOK_EVENT}}" \\',
    '  --data-urlencode "env=${CODING_AGENT_AGENT_HOOK_ENV-${ORCA_AGENT_HOOK_ENV}}" \\',
    '  --data-urlencode "version=${CODING_AGENT_AGENT_HOOK_VERSION-${ORCA_AGENT_HOOK_VERSION}}" \\',
    '  --data-urlencode "payload@-" >/dev/null 2>&1 || spool_hook_event',
    'exit 0',
    ''
  ].join('\n')
}
