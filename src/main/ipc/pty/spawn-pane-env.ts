import { deleteAppEnv, setAppEnv, setAppEnvKey } from '../../../shared/app-env'
import { mkdirSync } from 'node:fs'
import {
  buildJcodeRuntimeDirEnv,
  JCODE_RUNTIME_DIR_ENV_KEY
} from '../../../shared/jcode-runtime-dir'
import { applyScrubSafeAgentEnvAliases } from '../../../shared/agent-hook-listener/transport/agent-hook-scrub-safe-env'
import { isTerminalLeafId, makePaneKey } from '../../../shared/workspace-layout/stable-pane-id'
import { isValidTerminalTabId } from '../../../shared/workspace-layout/terminal-tab-id'

export type PtySpawnPane = {
  paneKey: string
  tabId: string | undefined
  worktreeId: string | undefined
}

export function ptySpawnPaneFromIds(ids: {
  tabId?: string
  leafId?: string
  worktreeId?: string
}): PtySpawnPane | null {
  const { tabId, leafId } = ids
  if (
    typeof tabId !== 'string' ||
    !isValidTerminalTabId(tabId) ||
    typeof leafId !== 'string' ||
    !isTerminalLeafId(leafId)
  ) {
    return null
  }
  return { paneKey: makePaneKey(tabId, leafId), tabId, worktreeId: ids.worktreeId }
}

type PtySpawnPaneEnvArgs = {
  /** Null when the spawn's own tab+leaf ids don't name a valid pane. */
  pane: PtySpawnPane | null
  jcodeRuntimeDir: string | undefined
}

export function stampPtySpawnPaneEnv(
  env: Record<string, string> | undefined,
  args: PtySpawnPaneEnvArgs
): void {
  if (!env) {
    return
  }
  const { pane } = args
  if (!pane) {
    // Shell/hook identity must name this spawn's own pane, never an unproved renderer key.
    deleteAppEnv(env, 'PANE_KEY')
    deleteAppEnv(env, 'TAB_ID')
    deleteAppEnv(env, 'WORKTREE_ID')
    deleteAppEnv(env, 'AGENT_LAUNCH_TOKEN')
    applyScrubSafeAgentEnvAliases(env)
    return
  }
  setAppEnv(env, 'PANE_KEY', pane.paneKey)
  if (pane.tabId !== undefined) {
    setAppEnv(env, 'TAB_ID', pane.tabId)
  } else {
    deleteAppEnv(env, 'TAB_ID')
  }
  if (pane.worktreeId !== undefined) {
    setAppEnv(env, 'WORKTREE_ID', pane.worktreeId)
  } else {
    deleteAppEnv(env, 'WORKTREE_ID')
  }
  // A failed managed-dir preparation must leave a working caller directory intact.
  if (args.jcodeRuntimeDir !== undefined) {
    setAppEnvKey(env, JCODE_RUNTIME_DIR_ENV_KEY, args.jcodeRuntimeDir)
  }
  // Why: SSH relay spawns skip the local/daemon env builders that otherwise mirror these.
  applyScrubSafeAgentEnvAliases(env)
}

/** Window local providers validate asynchronously; daemon spawns retain their synchronous preparation. */
export function selectWindowJcodeRuntimeDir(
  paneKey: string,
  isDaemonHostSpawn: boolean
): string | undefined {
  const runtimeDir = buildJcodeRuntimeDirEnv(paneKey)?.[JCODE_RUNTIME_DIR_ENV_KEY]
  if (runtimeDir === undefined) {
    return undefined
  }
  if (isDaemonHostSpawn) {
    try {
      mkdirSync(runtimeDir, { recursive: true })
    } catch {
      // Directory failure must not prevent an ordinary shell from opening.
      return undefined
    }
  }
  return runtimeDir
}
