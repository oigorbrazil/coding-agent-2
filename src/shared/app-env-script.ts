import { readAppEnv } from './app-env'

/** Generated hooks run outside the app bundle, including older installed runtimes. */
export function appEnvReadExpression(environment: string, name: string): string {
  return `(${readAppEnv.toString()})(${environment}, ${JSON.stringify(name)})`
}

export function posixAppEnvRead(name: string): string {
  return `\${CODING_AGENT_${name}-\${ORCA_${name}-}}`
}

export function posixAppEnvRestore(names: readonly string[]): string {
  return names
    .map(
      (name) =>
        `if [ "\${CODING_AGENT_${name}+set}" = set ]; then export ORCA_${name}="$CODING_AGENT_${name}"; elif [ "\${ORCA_${name}+set}" = set ]; then export CODING_AGENT_${name}="$ORCA_${name}"; fi`
    )
    .join('\n')
}

export function fishAppEnvRestore(names: readonly string[]): string {
  return names
    .map(
      (name) =>
        `if set -q CODING_AGENT_${name}; set -gx ORCA_${name} "$CODING_AGENT_${name}"; else if set -q ORCA_${name}; set -gx CODING_AGENT_${name} "$ORCA_${name}"; end`
    )
    .join('\n')
}

export function windowsAppEnvRestore(names: readonly string[]): string[] {
  return names
    .map((key) => key.replace(/^(?:ORCA_|CODING_AGENT_)/, ''))
    .flatMap((name) => [
      `if defined CODING_AGENT_${name} (set "ORCA_${name}=%CODING_AGENT_${name}%") else if defined ORCA_${name} set "CODING_AGENT_${name}=%ORCA_${name}%"`
    ])
}
