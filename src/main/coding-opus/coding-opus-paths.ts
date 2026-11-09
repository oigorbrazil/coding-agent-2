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

/** Same rule as the skill's orchestrate.py `default_policy_path`: %APPDATA%\CodingOpus or ~/.config/coding-opus. */
export function codingOpusStateDir(env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === 'win32') {
    const appData = env.APPDATA || join(env.USERPROFILE || homedir(), 'AppData', 'Roaming')
    return join(appData, 'CodingOpus')
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
