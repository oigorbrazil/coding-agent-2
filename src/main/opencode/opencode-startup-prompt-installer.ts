import { readAppEnv, setAppEnv, deleteAppEnv, deleteAppEnvKey } from '../../shared/app-env'
import { OpenCodeHookService, openCodeHookService, openCode2HookService } from './hook-service'
import { OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY } from '../../shared/opencode-startup-prompt-install'
import { join } from 'node:path'
import { resolveOpenCodeConfigDirectory } from '../../shared/opencode-config-directory'
import { isOverlayOpenCodePluginCurrent } from '../../shared/opencode-installed-plugin'
import { getOpenCodeStartupPromptSource } from './opencode-startup-prompt-source'
import { resolveOpenCodeSourceConfigDir } from '../ipc/pty/host-env/pi-agent'
import {
  OPENCODE_STARTUP_PROMPT_NONCE_ENV,
  OPENCODE_STARTUP_PROMPT_SHA256_ENV,
  OPENCODE_STARTUP_PROMPT_BODY_ENV,
  OPENCODE_STARTUP_PROMPT_ENDPOINT_ENV
} from '../../shared/agent-launch/startup/opencode-startup-prompt'

export function createOpenCodeStartupPromptInstaller(source: () => string): OpenCodeHookService {
  return new OpenCodeHookService({
    pluginFileName: `${OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY}.js`,
    legacyHooksDir: 'opencode-startup-prompt-hooks',
    overlayDir: 'opencode-startup-prompt-overlays',
    pluginSource: source,
    tuiOnlyDirectory: OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY
  })
}

const installer = createOpenCodeStartupPromptInstaller(getOpenCodeStartupPromptSource)

export function installOpenCodeStartupPromptForLaunch(
  env: Record<string, string>,
  restoreAfterShellStartup = true,
  sourceEnvironment: NodeJS.ProcessEnv = { ...process.env, ...env }
): boolean {
  const nonce = readAppEnv(env, 'OPENCODE_STARTUP_PROMPT_NONCE')
  if (!nonce || readAppEnv(env, 'OPENCODE_PLUGIN_API') !== 'v2') {
    return false
  }
  const source =
    resolveOpenCodeSourceConfigDir(env, sourceEnvironment) ||
    resolveOpenCodeConfigDirectory(sourceEnvironment)
  const statusOwner =
    readAppEnv(env, 'OPENCODE_AGENT') === 'opencode2' ? openCode2HookService : openCodeHookService
  const existing =
    env.OPENCODE_CONFIG_DIR && env.OPENCODE_CONFIG_DIR === readAppEnv(env, 'OPENCODE_CONFIG_DIR')
      ? installer.installIntoSourceOverlay(env.OPENCODE_CONFIG_DIR, source, statusOwner)
      : 'unmatched'
  const overlay =
    existing === 'installed'
      ? env.OPENCODE_CONFIG_DIR
      : existing === 'failed'
        ? undefined
        : installer.buildPtyEnv(nonce, source).OPENCODE_CONFIG_DIR
  if (
    !overlay ||
    !isOverlayOpenCodePluginCurrent(
      join(overlay, 'plugins', OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY, 'tui.js'),
      getOpenCodeStartupPromptSource()
    )
  ) {
    for (const key of [
      OPENCODE_STARTUP_PROMPT_NONCE_ENV,
      OPENCODE_STARTUP_PROMPT_SHA256_ENV,
      OPENCODE_STARTUP_PROMPT_BODY_ENV,
      OPENCODE_STARTUP_PROMPT_ENDPOINT_ENV
    ]) {
      deleteAppEnvKey(env, key)
    }
    return false
  }
  env.OPENCODE_CONFIG_DIR = overlay
  setAppEnv(env, 'OPENCODE_SOURCE_CONFIG_DIR', source)
  if (restoreAfterShellStartup || existing === 'installed') {
    setAppEnv(env, 'OPENCODE_CONFIG_DIR', overlay)
  } else {
    deleteAppEnv(env, 'OPENCODE_CONFIG_DIR')
  }
  return true
}

export function ensureOpenCodeStartupPromptForLaunch(env: Record<string, string>): void {
  if (
    readAppEnv(env, 'OPENCODE_STARTUP_PROMPT_NONCE') &&
    !installOpenCodeStartupPromptForLaunch(env)
  ) {
    throw new Error('Cannot prepare OpenCode startup prompt; launch was canceled.')
  }
}
