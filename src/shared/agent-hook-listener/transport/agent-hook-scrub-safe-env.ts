import { readAppEnvKey, setAppEnvKey, deleteAppEnvKey } from '../../app-env'
/** DSH0.1.5-rc.1 and Claude2.1.310 (CLAUDE_CODE_SUBPROCESS_ENV_SCRUB) scrub KEY/TOKEN/SECRET/PASSWORD names, including pane identity. Use scrub-safe aliases without replacing canonical names. */

/** Alias for `ORCA_PANE_KEY`. */
export const ORCA_SCRUB_SAFE_PANE_ENV = 'ORCA_AGENT_PANE' as const

/** Alias for `ORCA_AGENT_LAUNCH_TOKEN`. */
export const ORCA_SCRUB_SAFE_LAUNCH_ENV = 'ORCA_AGENT_LAUNCH' as const

const ALIASES: readonly (readonly [source: string, alias: string])[] = [
  ['ORCA_PANE_KEY', ORCA_SCRUB_SAFE_PANE_ENV],
  ['ORCA_AGENT_LAUNCH_TOKEN', ORCA_SCRUB_SAFE_LAUNCH_ENV]
]

/** Drop aliases whose source is absent so inherited parent identity cannot claim this pane's hooks. */
export function applyScrubSafeAgentEnvAliases(env: Record<string, string>): void {
  for (const [source, alias] of ALIASES) {
    const value = readAppEnvKey(env, source)
    if (value === undefined || value === '') {
      deleteAppEnvKey(env, alias)
      continue
    }
    setAppEnvKey(env, alias, value)
  }
}

/** POSIX hook prologue: refill the canonical names from their aliases; never overwrites a live value. */
export function buildPosixScrubSafeEnvRestoreLines(): string[] {
  return ALIASES.flatMap(([source, alias]) => {
    const current = source.replace('ORCA_', 'CODING_AGENT_')
    const currentAlias = alias.replace('ORCA_', 'CODING_AGENT_')
    return [
      `${source}="\${${current}-\${${source}:-\${${currentAlias}-\${${alias}:-}}}}"`,
      `${current}="$${source}"; export ${source} ${current}`
    ]
  })
}

export function buildWindowsScrubSafeEnvRestoreLines(): string[] {
  return ALIASES.flatMap(([source, alias]) => {
    const current = source.replace('ORCA_', 'CODING_AGENT_')
    const currentAlias = alias.replace('ORCA_', 'CODING_AGENT_')
    return [
      `if defined ${current} set "${source}=%${current}%"`,
      `if not defined ${source} if defined ${currentAlias} set "${source}=%${currentAlias}%"`,
      `if not defined ${source} if defined ${alias} set "${source}=%${alias}%"`,
      `if defined ${source} set "${current}=%${source}%"`
    ]
  })
}
