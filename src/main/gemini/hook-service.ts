import type { SFTPWrapper } from 'ssh2'
import type {
  AgentHookInstallState,
  AgentHookInstallStatus
} from '../../shared/agent-hook-listener/configuration/agent-hook-types'

import {
  type HookDefinition,
  buildManagedCommandHook,
  createManagedCommandMatcher,
  buildWindowsAgentHookPostCommand,
  getSharedManagedScriptPath,
  MANAGED_HOOK_TIMEOUT_MILLISECONDS,
  readHooksJson,
  removeManagedCommands,
  wrapPosixHookCommand,
  writeHooksJson,
  writeManagedScript
} from '../agent-hooks/installer-utils'
import { windowsAppEnvRestore } from '../../shared/app-env-script'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { wrapWindowsBatchHookCommand } from '../agent-hooks/windows-direct-cmd-hook-command'
import { refreshManagedScriptIfPresent } from '../agent-hooks/managed-hook-script-refresh'
import {
  readHooksJsonRemote,
  writeHooksJsonRemote,
  writeManagedScriptRemote
} from '../agent-hooks/installer-utils-remote'
import {
  buildPosixHookEndpointReloadLines,
  buildWindowsHookEndpointReloadLines,
  buildPosixHookPayloadCapture,
  buildPosixHookSpoolLines,
  buildWindowsHookEnvironmentGuardLines
} from '../agent-hooks/hook-stdin-contract'
import { posixCurlCommand } from '../agent-hooks/hook-post-command'

// Gemini has no permission-prompt hook, so approvals cannot produce a Coding Agent 2 waiting state.
// Gemini uses BeforeTool; remove stale Claude-style PreToolUse registrations below.
const GEMINI_EVENTS = ['BeforeAgent', 'AfterAgent', 'AfterTool', 'BeforeTool'] as const

function getConfigPath(): string {
  return join(homedir(), '.gemini', 'settings.json')
}

function getManagedScriptFileName(): string {
  return process.platform === 'win32' ? 'gemini-hook.cmd' : 'gemini-hook.sh'
}

function getManagedScriptPath(): string {
  return getSharedManagedScriptPath(getManagedScriptFileName())
}

function getManagedCommand(scriptPath: string): string {
  return process.platform === 'win32'
    ? wrapWindowsBatchHookCommand(scriptPath)
    : wrapPosixHookCommand(scriptPath)
}

function getManagedScript(target: 'local' | 'posix' = 'local'): string {
  if (target === 'local' && process.platform === 'win32') {
    return [
      '@echo off',
      'setlocal',
      ...windowsAppEnvRestore([
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
      // Reply before guards can exit so Gemini always receives valid hook JSON.
      'echo {}',
      // Refresh endpoint credentials for PTYs that outlive a Coding Agent 2 restart.
      ...buildWindowsHookEndpointReloadLines(),
      ...buildWindowsHookEnvironmentGuardLines(),
      buildWindowsAgentHookPostCommand('gemini'),
      'exit /b 0',
      ''
    ].join('\r\n')
  }

  return [
    '#!/bin/sh',
    // Reply before guards can exit so Gemini always receives valid hook JSON.
    'printf "{}\\n"',
    ...buildPosixHookPayloadCapture(),
    ...buildPosixHookSpoolLines('gemini'),
    // Refresh endpoint credentials for PTYs that outlive a Coding Agent 2 restart.
    ...buildPosixHookEndpointReloadLines(),
    'if [ -z "${CODING_AGENT_AGENT_HOOK_PORT-$ORCA_AGENT_HOOK_PORT}" ] || [ -z "${CODING_AGENT_AGENT_HOOK_TOKEN-$ORCA_AGENT_HOOK_TOKEN}" ] || [ -z "${CODING_AGENT_PANE_KEY-$ORCA_PANE_KEY}" ]; then',
    '  spool_hook_event',
    '  exit 0',
    'fi',
    // Form encoding handles quotes/newlines in paths; stdin keeps large payloads off the command line.
    `printf '%s' "$payload" | ${posixCurlCommand()} -sS -X POST "http://127.0.0.1:\${CODING_AGENT_AGENT_HOOK_PORT-\${ORCA_AGENT_HOOK_PORT}}/hook/gemini" \\`,
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

export class GeminiHookService {
  async refreshManagedScripts(): Promise<void> {
    await refreshManagedScriptIfPresent(getManagedScriptPath(), getManagedScript())
  }

  getStatus(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const scriptPath = getManagedScriptPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'gemini',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Gemini settings.json'
      }
    }

    const command = getManagedCommand(scriptPath)
    const missing: string[] = []
    let presentCount = 0
    for (const eventName of GEMINI_EVENTS) {
      const definitions = Array.isArray(config.hooks?.[eventName]) ? config.hooks![eventName]! : []
      const hasCommand = definitions.some((definition) =>
        (definition.hooks ?? []).some((hook) => hook.command === command)
      )
      if (hasCommand) {
        presentCount += 1
      } else {
        missing.push(eventName)
      }
    }
    const managedHooksPresent = presentCount > 0
    let state: AgentHookInstallState
    let detail: string | null
    if (missing.length === 0) {
      state = 'installed'
      detail = null
    } else if (presentCount === 0) {
      state = 'not_installed'
      detail = null
    } else {
      state = 'partial'
      detail = `Managed hook missing for events: ${missing.join(', ')}`
    }
    return { agent: 'gemini', state, configPath, managedHooksPresent, detail }
  }

  install(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const scriptPath = getManagedScriptPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'gemini',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Gemini settings.json'
      }
    }

    const command = getManagedCommand(scriptPath)
    const nextHooks = { ...config.hooks }

    // Match filenames so moved scripts replace stale registrations rather than duplicating them.
    const isManagedCommand = createManagedCommandMatcher(getManagedScriptFileName())

    const managedEvents = new Set<string>(GEMINI_EVENTS)

    for (const [eventName, definitions] of Object.entries(nextHooks)) {
      if (managedEvents.has(eventName)) {
        continue
      }
      if (!Array.isArray(definitions)) {
        continue
      }
      const cleaned = removeManagedCommands(definitions, isManagedCommand)
      if (cleaned.length === 0) {
        delete nextHooks[eventName]
      } else {
        nextHooks[eventName] = cleaned
      }
    }

    for (const eventName of GEMINI_EVENTS) {
      const current = Array.isArray(nextHooks[eventName]) ? nextHooks[eventName] : []
      const cleaned = removeManagedCommands(current, isManagedCommand)
      const definition: HookDefinition = {
        // Gemini hook timeouts use milliseconds.
        hooks: [buildManagedCommandHook(command, MANAGED_HOOK_TIMEOUT_MILLISECONDS)]
      }
      nextHooks[eventName] = [...cleaned, definition]
    }

    config.hooks = nextHooks
    writeManagedScript(scriptPath, getManagedScript())
    writeHooksJson(configPath, config)
    return this.getStatus()
  }

  // Remote hooks use POSIX paths and the same event/config contract as local installation.
  async installRemote(sftp: SFTPWrapper, remoteHome: string): Promise<AgentHookInstallStatus> {
    const remoteConfigPath = `${remoteHome.replace(/\/$/, '')}/.gemini/settings.json`
    const remoteScriptPath = `${remoteHome.replace(/\/$/, '')}/.coding-agent-2/agent-hooks/gemini-hook.sh`
    try {
      const config = await readHooksJsonRemote(sftp, remoteConfigPath)
      if (!config) {
        return {
          agent: 'gemini',
          state: 'error',
          configPath: remoteConfigPath,
          managedHooksPresent: false,
          detail: 'Could not parse remote Gemini settings.json'
        }
      }

      const command = wrapPosixHookCommand(remoteScriptPath)
      const nextHooks = { ...config.hooks }
      const isManagedCommand = createManagedCommandMatcher('gemini-hook.sh')
      const managedEvents = new Set<string>(GEMINI_EVENTS)

      for (const [eventName, definitions] of Object.entries(nextHooks)) {
        if (managedEvents.has(eventName)) {
          continue
        }
        if (!Array.isArray(definitions)) {
          continue
        }
        const cleaned = removeManagedCommands(definitions, isManagedCommand)
        if (cleaned.length === 0) {
          delete nextHooks[eventName]
        } else {
          nextHooks[eventName] = cleaned
        }
      }

      for (const eventName of GEMINI_EVENTS) {
        const current = Array.isArray(nextHooks[eventName]) ? nextHooks[eventName] : []
        const cleaned = removeManagedCommands(current, isManagedCommand)
        const definition: HookDefinition = {
          // Gemini hook timeouts use milliseconds.
          hooks: [buildManagedCommandHook(command, MANAGED_HOOK_TIMEOUT_MILLISECONDS)]
        }
        nextHooks[eventName] = [...cleaned, definition]
      }
      config.hooks = nextHooks

      // Publish scripts before config so interrupted installs cannot reference missing files.
      // Remote hook syntax is POSIX regardless of the client platform.
      await writeManagedScriptRemote(sftp, remoteScriptPath, getManagedScript('posix'))
      await writeHooksJsonRemote(sftp, remoteConfigPath, config)

      return {
        agent: 'gemini',
        state: 'installed',
        configPath: remoteConfigPath,
        managedHooksPresent: true,
        detail: null
      }
    } catch (err) {
      return {
        agent: 'gemini',
        state: 'error',
        configPath: remoteConfigPath,
        managedHooksPresent: false,
        detail: err instanceof Error ? err.message : String(err)
      }
    }
  }

  remove(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'gemini',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Gemini settings.json'
      }
    }

    const nextHooks = { ...config.hooks }
    const isManagedCommand = createManagedCommandMatcher(getManagedScriptFileName())
    for (const [eventName, definitions] of Object.entries(nextHooks)) {
      if (!Array.isArray(definitions)) {
        continue
      }
      const cleaned = removeManagedCommands(definitions, isManagedCommand)
      if (cleaned.length === 0) {
        delete nextHooks[eventName]
      } else {
        nextHooks[eventName] = cleaned
      }
    }
    config.hooks = nextHooks
    writeHooksJson(configPath, config)
    return this.getStatus()
  }
}

export const geminiHookService = new GeminiHookService()
