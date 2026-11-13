import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

/** Skill folder name; agents load it as `/coding`. */
export const CODING_OPUS_SKILL_NAME = 'coding'

/** The vendored `skills/coding` folder from oigorbrazil/coding-opus (see resources/coding-opus/SOURCE.json). */
export function codingOpusBundleRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'coding-opus')
    : join(app.getAppPath(), 'resources', 'coding-opus')
}

export function codingOpusBundledSkillDir(): string {
  return join(codingOpusBundleRoot(), CODING_OPUS_SKILL_NAME)
}

/**
 * Same rule as the skill's orchestrate.py `default_policy_path`: %USERPROFILE%\.coding-opus on Windows,
 * ~/.config/coding-opus elsewhere. Windows moved out of %APPDATA% because packaged apps (the Claude
 * desktop app among them) virtualize AppData, so their sessions and this app saw different files.
 */
export function codingOpusStateDir(
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform === 'win32') {
    const profile = env.USERPROFILE || homedir()
    const current = join(profile, '.coding-opus')
    const legacy = join(env.APPDATA || join(profile, 'AppData', 'Roaming'), 'CodingOpus')
    // The runner copies the legacy folder over on its first run; until then the state is still there.
    return !exists(current) && exists(legacy) ? legacy : current
  }
  const configHome = env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(configHome, 'coding-opus')
}

/** orchestrate.py's `user_playbooks_path`: CODING_OPUS_PLAYBOOKS, else next to the policy file. */
export function codingOpusPlaybooksPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.CODING_OPUS_PLAYBOOKS?.trim()
  return configured ? configured : join(codingOpusStateDir(env), 'coding-opus-playbooks.yaml')
}

/** Claude Code honors CLAUDE_CONFIG_DIR; Codex reads the shared `~/.agents/skills` root. */
export function codingOpusSkillRoots(env: NodeJS.ProcessEnv = process.env): {
  claude: string
  codex: string
} {
  const claudeHome = env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), '.claude')
  return {
    claude: join(claudeHome, 'skills'),
    codex: join(homedir(), '.agents', 'skills')
  }
}
