import { windowsAppEnvRestore } from '../../shared/app-env-script'
import { posixCurlCommand } from '../agent-hooks/hook-post-command'
import { buildHookProcessCapture } from '../agent-hooks/hook-process-capture'
import {
  buildPosixHookEndpointReloadLines,
  buildWindowsHookEndpointReloadLines,
  buildPosixHookPayloadCapture,
  POSIX_HOOK_JSON_STDIN,
  buildPosixHookSpoolLines,
  buildWindowsHookEnvironmentGuardLines
} from '../agent-hooks/hook-stdin-contract'
import { ANTIGRAVITY_PRE_TOOL_USE_DECISION } from './hook-events'

export function getManagedScript(
  target: 'local' | 'posix' = 'local',
  windowsRuntimePath = process.execPath
): string {
  if (target === 'local' && process.platform === 'win32') {
    return [
      '@echo off',
      // Delayed expansion corrupts literal ! characters in paths and hook coordinates.
      'setlocal DisableDelayedExpansion',
      ...windowsAppEnvRestore([
        'ANTIGRAVITY_EVENT',
        'AGENT_HOOK_ENDPOINT',
        'AGENT_HOOK_NODE',
        'AGENT_HOOK_PORT',
        'AGENT_HOOK_TOKEN',
        'PANE_KEY',
        'TAB_ID',
        'AGENT_LAUNCH_TOKEN',
        'WORKTREE_ID',
        'AGENT_HOOK_ENV',
        'AGENT_HOOK_VERSION',
        'ANTIGRAVITY_CORE'
      ]),
      'if /I "%ORCA_ANTIGRAVITY_EVENT%"=="Stop" (',
      '  echo {"decision":""}',
      ') else if /I "%ORCA_ANTIGRAVITY_EVENT%"=="PreToolUse" (',
      `  echo ${ANTIGRAVITY_PRE_TOOL_USE_DECISION}`,
      ') else (',
      '  echo {}',
      ')',
      ...buildWindowsHookEndpointReloadLines(),
      ...buildWindowsHookEnvironmentGuardLines(),
      'set "ELECTRON_RUN_AS_NODE=1"',
      `if not defined ORCA_AGENT_HOOK_NODE (set "ORCA_AGENT_HOOK_NODE=${windowsRuntimePath.replaceAll('%', '%%')}" & set "CODING_AGENT_AGENT_HOOK_NODE=${windowsRuntimePath.replaceAll('%', '%%')}")`,
      '"%ORCA_AGENT_HOOK_NODE%" "%~dp0antigravity-hook-post.cjs" >nul 2>nul',
      'exit /b 0',
      ''
    ].join('\r\n')
  }

  return [
    '#!/bin/sh',
    'case "${CODING_AGENT_ANTIGRAVITY_EVENT-$ORCA_ANTIGRAVITY_EVENT}" in',
    '  Stop)',
    '    printf \'{"decision":""}\\n\'',
    '    ;;',
    '  PreToolUse)',
    `    printf '${ANTIGRAVITY_PRE_TOOL_USE_DECISION}\\n'`,
    '    ;;',
    '  *)',
    '    printf "{}\\n"',
    '    ;;',
    'esac',
    // Events without stdin still need a status post.
    ...buildPosixHookPayloadCapture('empty-object', POSIX_HOOK_JSON_STDIN),
    ...buildHookProcessCapture(),
    ...buildPosixHookSpoolLines('antigravity', 'ORCA_ANTIGRAVITY_EVENT'),
    ...buildPosixHookEndpointReloadLines(),
    'if [ -z "${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" ] || [ -z "${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}" ] || [ -z "${CODING_AGENT_PANE_KEY-$ORCA_PANE_KEY}" ]; then',
    '  spool_hook_event',
    '  exit 0',
    'fi',
    // Keep large payloads off command lines to avoid EDR false positives.
    `printf '%s' "$payload" | ${posixCurlCommand()} -sS -X POST "http://127.0.0.1:\${CODING_AGENT_AGENT_HOOK_PORT-\${ORCA_AGENT_HOOK_PORT}}/hook/antigravity" \\`,
    '  --connect-timeout 0.5 --max-time 1.5 \\',
    '  -H "Content-Type: application/x-www-form-urlencoded" \\',
    '  -H "X-Orca-Agent-Hook-Token: ${CODING_AGENT_AGENT_HOOK_TOKEN-${ORCA_AGENT_HOOK_TOKEN}}" \\',
    '  --data-urlencode "paneKey=${CODING_AGENT_PANE_KEY-${ORCA_PANE_KEY}}" \\',
    '  --data-urlencode "tabId=${CODING_AGENT_TAB_ID-${ORCA_TAB_ID}}" \\',
    '  --data-urlencode "launchToken=${CODING_AGENT_AGENT_LAUNCH_TOKEN-${ORCA_AGENT_LAUNCH_TOKEN}}" \\',
    '  --data-urlencode "worktreeId=${CODING_AGENT_WORKTREE_ID-${ORCA_WORKTREE_ID}}" \\',
    '  --data-urlencode "env=${CODING_AGENT_AGENT_HOOK_ENV-${ORCA_AGENT_HOOK_ENV}}" \\',
    '  --data-urlencode "version=${CODING_AGENT_AGENT_HOOK_VERSION-${ORCA_AGENT_HOOK_VERSION}}" \\',
    '  --data-urlencode "hook_event_name=${CODING_AGENT_ANTIGRAVITY_EVENT-${ORCA_ANTIGRAVITY_EVENT}}" \\',
    '  --data-urlencode "agentProcess=${orca_agent_process}" \\',
    '  --data-urlencode "tmuxPane=${orca_tmux_pane}" \\',
    '  --data-urlencode "payload@-" >/dev/null 2>&1 || spool_hook_event',
    'exit 0',
    ''
  ].join('\n')
}

export function getWindowsWrapperScript(eventName: string): string {
  return [
    '@echo off',
    // Preserve literal ! characters in the percent-expanded hooks path.
    'setlocal DisableDelayedExpansion',
    ...windowsAppEnvRestore([
      'ANTIGRAVITY_EVENT',
      'AGENT_HOOK_ENDPOINT',
      'AGENT_HOOK_NODE',
      'AGENT_HOOK_PORT',
      'AGENT_HOOK_TOKEN',
      'PANE_KEY',
      'TAB_ID',
      'AGENT_LAUNCH_TOKEN',
      'WORKTREE_ID',
      'AGENT_HOOK_ENV',
      'AGENT_HOOK_VERSION',
      'ANTIGRAVITY_CORE'
    ]),
    `set "ORCA_ANTIGRAVITY_EVENT=${eventName}"`,
    `set "CODING_AGENT_ANTIGRAVITY_EVENT=${eventName}"`,
    'set "ORCA_ANTIGRAVITY_CORE=%~dp0antigravity-hook.cmd"\nset "CODING_AGENT_ANTIGRAVITY_CORE=%~dp0antigravity-hook.cmd"',
    'if exist "%ORCA_ANTIGRAVITY_CORE%" (',
    '  call "%ORCA_ANTIGRAVITY_CORE%"',
    '  exit /b 0',
    ')',
    'if /I "%ORCA_ANTIGRAVITY_EVENT%"=="Stop" (',
    '  echo {"decision":""}',
    ') else if /I "%ORCA_ANTIGRAVITY_EVENT%"=="PreToolUse" (',
    `  echo ${ANTIGRAVITY_PRE_TOOL_USE_DECISION}`,
    ') else (',
    '  echo {}',
    ')',
    ...buildWindowsHookEnvironmentGuardLines(),
    'exit /b 0',
    ''
  ].join('\r\n')
}
