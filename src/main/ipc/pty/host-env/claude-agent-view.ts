import type { BuildPtyHostEnvOptions } from './types'
import { readAppEnv, deleteAppEnv, setAppEnv } from '../../../../shared/app-env'
import { delimiter } from 'node:path'
import { isTuiAgentEnabled } from '../../../../shared/agent-launch/catalog/tui-agent-selection'
import { getClaudeAgentViewService } from '../../../claude/agent-view/agent-view-service'

export function applyClaudeAgentViewEnv(
  env: Record<string, string>,
  opts: BuildPtyHostEnvOptions
): void {
  const previous =
    readAppEnv(env, 'CLAUDE_AGENT_VIEW_PLUGIN_DIR') ??
    readAppEnv(process.env, 'CLAUDE_AGENT_VIEW_PLUGIN_DIR')
  if (previous) {
    const paths = env.CLAUDE_CODE_PLUGIN_DIRS ?? process.env.CLAUDE_CODE_PLUGIN_DIRS
    if (paths?.split(delimiter).includes(previous)) {
      const remaining = paths.split(delimiter).filter((path) => path !== previous)
      // An empty override is needed only to strip an inherited Coding Agent 2 path merged later by a daemon.
      env.CLAUDE_CODE_PLUGIN_DIRS = remaining.join(delimiter)
    }
  }
  deleteAppEnv(env, 'CLAUDE_AGENT_VIEW_PLUGIN_DIR')
  deleteAppEnv(env, 'CLAUDE_CONFIG_DIR')
  if (
    !opts.agentStatusHooksEnabled ||
    opts.claudeSubagentNavigationEnabled === false ||
    !isTuiAgentEnabled('claude', opts.disabledTuiAgents) ||
    opts.isWsl
  ) {
    return
  }
  const cached = getClaudeAgentViewService(opts.userDataPath).read(env.CLAUDE_CONFIG_DIR)
  if (!cached) {
    return
  }
  const paths =
    (env.CLAUDE_CODE_PLUGIN_DIRS ?? process.env.CLAUDE_CODE_PLUGIN_DIRS)
      ?.split(delimiter)
      .filter(Boolean) ?? []
  if (!paths.includes(cached.pluginDir)) {
    paths.push(cached.pluginDir)
  }
  env.CLAUDE_CODE_PLUGIN_DIRS = paths.join(delimiter)
  setAppEnv(env, 'CLAUDE_AGENT_VIEW_PLUGIN_DIR', cached.pluginDir)
  setAppEnv(env, 'CLAUDE_CONFIG_DIR', cached.configDir)
}
