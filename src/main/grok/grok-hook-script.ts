import { posixCurlCommand } from '../agent-hooks/hook-post-command'
import { getSharedManagedScriptPath, wrapPosixHookCommand } from '../agent-hooks/installer-utils'
import { wrapWindowsBatchHookCommand } from '../agent-hooks/windows-direct-cmd-hook-command'
import {
  buildPosixHookEndpointReloadLines,
  buildPosixHookPayloadCapture,
  buildPosixHookSpoolLines,
  POSIX_HOOK_JSON_STDIN
} from '../agent-hooks/hook-stdin-contract'
import {
  buildWindowsGrokHookScript,
  GROK_HOME_ENVELOPE_MAX_LENGTH
} from './windows-grok-hook-script'

export function getGrokManagedScriptFileName(): string {
  return process.platform === 'win32' ? 'grok-hook.cmd' : 'grok-hook.sh'
}

export function getGrokManagedScriptPath(): string {
  return getSharedManagedScriptPath(getGrokManagedScriptFileName())
}

export function getGrokManagedCommand(scriptPath: string): string {
  // POSIX can gate before spawning because Coding Agent 2 injects ORCA_PANE_KEY only into panes it owns.
  return process.platform === 'win32'
    ? wrapWindowsBatchHookCommand(scriptPath)
    : wrapPosixHookCommand(scriptPath, {}, { requiredEnvVar: 'ORCA_PANE_KEY' })
}

export function getGrokManagedScript(target: 'local' | 'posix' = 'local'): string {
  if (target === 'local' && process.platform === 'win32') {
    return buildWindowsGrokHookScript()
  }

  return [
    '#!/bin/sh',
    ...buildPosixHookPayloadCapture('exit', POSIX_HOOK_JSON_STDIN),
    ...buildPosixHookSpoolLines('grok'),
    ...buildPosixHookEndpointReloadLines(),
    'if [ -z "${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" ] || [ -z "${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}" ] || [ -z "${CODING_AGENT_PANE_KEY-$ORCA_PANE_KEY}" ]; then',
    '  spool_hook_event',
    '  exit 0',
    'fi',
    'grok_home=',
    `if [ -n "\${GROK_HOME:-}" ] && [ "\${#GROK_HOME}" -le ${GROK_HOME_ENVELOPE_MAX_LENGTH} ]; then`,
    '  grok_home=$GROK_HOME',
    'fi',
    `printf '%s' "$payload" | ${posixCurlCommand()} -sS -X POST "http://127.0.0.1:\${CODING_AGENT_AGENT_HOOK_PORT-\${ORCA_AGENT_HOOK_PORT}}/hook/grok" \\`,
    '  --connect-timeout 0.5 --max-time 1.5 \\',
    '  -H "Content-Type: application/x-www-form-urlencoded" \\',
    '  -H "X-Orca-Agent-Hook-Token: ${CODING_AGENT_AGENT_HOOK_TOKEN-${ORCA_AGENT_HOOK_TOKEN}}" \\',
    '  --data-urlencode "paneKey=${CODING_AGENT_PANE_KEY-${ORCA_PANE_KEY}}" \\',
    '  --data-urlencode "tabId=${CODING_AGENT_TAB_ID-${ORCA_TAB_ID}}" \\',
    '  --data-urlencode "launchToken=${CODING_AGENT_AGENT_LAUNCH_TOKEN-${ORCA_AGENT_LAUNCH_TOKEN}}" \\',
    '  --data-urlencode "worktreeId=${CODING_AGENT_WORKTREE_ID-${ORCA_WORKTREE_ID}}" \\',
    '  --data-urlencode "env=${CODING_AGENT_AGENT_HOOK_ENV-${ORCA_AGENT_HOOK_ENV}}" \\',
    '  --data-urlencode "version=${CODING_AGENT_AGENT_HOOK_VERSION-${ORCA_AGENT_HOOK_VERSION}}" \\',
    '  --data-urlencode "grokHome=${grok_home}" \\',
    '  --data-urlencode "payload@-" >/dev/null 2>&1 || spool_hook_event',
    'exit 0',
    ''
  ].join('\n')
}
